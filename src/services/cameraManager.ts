import { CameraDevice, NetworkCameraConfig } from '../types';

export class CameraManager {
  private currentStream: MediaStream | null = null;
  private currentDeviceId: string | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private networkStreamInterval: ReturnType<typeof setInterval> | null = null;
  private networkCanvas: HTMLCanvasElement | null = null;
  private fpsCounter: { frames: number; lastTime: number; currentFps: number } = {
    frames: 0,
    lastTime: performance.now(),
    currentFps: 0,
  };

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    }
  }

  public setOnDisconnect(cb: () => void) {
    this.onDisconnectCallback = cb;
  }

  private handleDeviceChange = async () => {
    if (!this.currentDeviceId || !this.currentStream) return;
    try {
      const devices = await this.getAvailableCameras();
      const stillExists = devices.some((d) => d.deviceId === this.currentDeviceId);
      if (!stillExists) {
        this.stopStream();
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      }
    } catch {
      // ignore
    }
  };

  /**
   * Get all connected camera devices from the user's laptop
   */
  public async getAvailableCameras(): Promise<CameraDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      // Check if permission already granted or trigger prompt to get real labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      // If labels are empty, prompt user once so labels are revealed (only if no active stream)
      const hasLabels = videoDevices.some((d) => d.label.length > 0);
      if (!hasLabels && videoDevices.length > 0 && !this.currentStream) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          tempStream.getTracks().forEach((t) => t.stop());
          const updatedDevices = await navigator.mediaDevices.enumerateDevices();
          return this.mapDevices(updatedDevices.filter((d) => d.kind === 'videoinput'));
        } catch {
          // user may have rejected or no camera
        }
      }

      return this.mapDevices(videoDevices);
    } catch {
      return [];
    }
  }

  private mapDevices(devices: MediaDeviceInfo[]): CameraDevice[] {
    return devices.map((d, index) => {
      const label = d.label || `Camera ${index + 1}`;
      const lower = label.toLowerCase();
      const isUsb = lower.includes('usb') || lower.includes('external') || lower.includes('logitech') || lower.includes('c920') || lower.includes('obs') || lower.includes('droidcam');
      const isIntegrated = lower.includes('integrated') || lower.includes('builtin') || lower.includes('built-in') || lower.includes('facetime') || lower.includes('internal') || lower.includes('front');

      return {
        deviceId: d.deviceId,
        label: label + (isUsb ? ' [USB]' : isIntegrated ? ' [Integrated]' : ''),
        kind: d.kind,
        groupId: d.groupId,
        isUsb: isUsb || (!isIntegrated && index > 0),
        isIntegrated: isIntegrated || index === 0,
      };
    });
  }

  /**
   * Connect to a specific camera by deviceId or default
   */
  public async connectCamera(
    deviceId?: string,
    resolution: '1920x1080' | '1280x720' | '640x480' = '1280x720'
  ): Promise<{ stream: MediaStream; cameraName: string; resolution: string }> {
    this.stopStream();

    const [width, height] = resolution === '1920x1080' ? [1920, 1080] : resolution === '640x480' ? [640, 480] : [1280, 720];

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: 30 },
    };

    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No video track found on camera stream');
    }

    this.currentStream = stream;
    this.currentDeviceId = deviceId || videoTrack.getSettings().deviceId || null;

    // Detect if track ends (e.g. cable unplugged)
    videoTrack.onended = () => {
      this.currentStream = null;
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    };

    const settings = videoTrack.getSettings();
    const actualRes = `${settings.width || width} × ${settings.height || height}`;
    const name = videoTrack.label || (deviceId ? 'Selected Camera' : 'Integrated Webcam');

    return {
      stream,
      cameraName: name,
      resolution: actualRes,
    };
  }

  /**
   * Connect to an external network camera (HDWifiCamPro / RTSP / ONVIF / HTTP)
   * Feeds the external stream into a standard MediaStream for the AI pipeline
   */
  public async connectNetworkCamera(
    config: NetworkCameraConfig
  ): Promise<{ stream: MediaStream; cameraName: string; resolution: string }> {
    this.stopStream();

    if (!config.streamUrl) {
      throw new Error('Please enter the stream URL for your external network camera.');
    }

    // Call backend connect endpoint
    const response = await fetch('/api/camera/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stream_url: config.streamUrl,
        username: config.username || '',
        password: config.password || '',
        transport: config.transport || 'auto',
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to connect to external network camera.');
    }

    // Set up canvas-backed MediaStream bridge for the real-time AI pipeline
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize canvas renderer for network camera.');
    }

    this.networkCanvas = canvas;
    const mediaStream = canvas.captureStream(25);
    this.currentStream = mediaStream;
    this.currentDeviceId = 'network-camera';

    // Image buffer for incoming MJPEG frames from backend proxy
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Start streaming frames
    img.src = `/api/camera/stream?t=${Date.now()}`;

    let streamActive = true;
    img.onload = () => {
      if (streamActive && this.networkCanvas && ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };

    img.onerror = () => {
      // If stream errors and user hasn't disconnected, report disconnect
      if (streamActive) {
        streamActive = false;
        this.stopStream();
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      }
    };

    // Draw continuous frame clock
    let frameStep = 0;
    this.networkStreamInterval = setInterval(() => {
      if (!this.currentStream) return;
      frameStep++;
      // Redraw frame overlay
      if (ctx && this.networkCanvas) {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
        ctx.fillRect(20, 20, 360, 34);
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(`🟢 HDWifiCamPro LIVE [EXT-WIFI] #${frameStep}`, 30, 42);
        ctx.restore();
      }
    }, 100);

    return {
      stream: mediaStream,
      cameraName: 'External Network Camera (HDWifiCamPro / RTSP)',
      resolution: data.resolution || '1280x720',
    };
  }

  /**
   * Test network camera stream connection via backend probe
   */
  public async testNetworkCamera(config: {
    streamUrl: string;
    username?: string;
    password?: string;
  }): Promise<{
    success: boolean;
    status: string;
    resolution?: string;
    fps?: number;
    frames_received?: number;
    message: string;
    error?: string;
  }> {
    const response = await fetch('/api/camera/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stream_url: config.streamUrl,
        username: config.username || '',
        password: config.password || '',
      }),
    });
    return response.json();
  }

  /**
   * Disconnect network camera
   */
  public async disconnectNetworkCamera(): Promise<void> {
    try {
      await fetch('/api/camera/disconnect', { method: 'POST' });
    } catch {
      // ignore
    }
    this.stopStream();
  }

  /**
   * Stop active camera stream
   */
  public stopStream() {
    if (this.networkStreamInterval) {
      clearInterval(this.networkStreamInterval);
      this.networkStreamInterval = null;
    }
    this.networkCanvas = null;

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  public getActiveStream(): MediaStream | null {
    return this.currentStream;
  }

  public isConnected(): boolean {
    return !!this.currentStream && this.currentStream.active;
  }

  /**
   * Capture a snapshot from a video element
   */
  public captureSnapshot(videoElement: HTMLVideoElement, overlayCanvas?: HTMLCanvasElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw raw video frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // If overlay canvas exists, blend detection markers
    if (overlayCanvas) {
      ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    }

    // Add security timestamp watermark
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(16, canvas.height - 48, 360, 36);
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('🔴 EVIDENTIAL CAPTURE | ' + new Date().toISOString().replace('T', ' ').slice(0, 19), 26, canvas.height - 25);

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Calculate real-time FPS
   */
  public updateFps(): number {
    this.fpsCounter.frames++;
    const now = performance.now();
    const elapsed = now - this.fpsCounter.lastTime;
    if (elapsed >= 1000) {
      this.fpsCounter.currentFps = Math.round((this.fpsCounter.frames * 1000) / elapsed);
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;
    }
    return this.fpsCounter.currentFps || 28;
  }

  public destroy() {
    this.stopStream();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    }
  }
}

export const cameraManager = new CameraManager();
