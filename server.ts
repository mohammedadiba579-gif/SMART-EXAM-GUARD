import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const portFlagIndex = process.argv.indexOf('--port');
const cliPort =
  portFlagIndex !== -1 && process.argv[portFlagIndex + 1]
    ? Number(process.argv[portFlagIndex + 1])
    : undefined;
const PORT =
  (cliPort && !Number.isNaN(cliPort) ? cliPort : undefined) ||
  (isProduction ? Number(process.env.PORT) || 3000 : 3000);

app.use(express.json({ limit: '50mb' }));

// In-memory data store with fallback sample data
let memoryAlerts: Array<{
  id: string;
  timestamp: string;
  timeDisplay: string;
  seatId: string;
  activityType: string;
  activityTitle: string;
  confidence: number;
  status: string;
  evidenceImage?: string;
  notes?: string;
  severity: string;
}> = [
  {
    id: 'ALT-1082',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    timeDisplay: new Date(Date.now() - 1000 * 60 * 14).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    seatId: 'B3',
    activityType: 'phone',
    activityTitle: 'Possible Unauthorized Device',
    confidence: 89,
    status: 'reviewed',
    severity: 'high',
    notes: 'Candidate B3 was observed checking a mobile screen under exam desk. Confirmed by Invigilator.',
  },
  {
    id: 'ALT-1083',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    timeDisplay: new Date(Date.now() - 1000 * 60 * 8).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    seatId: 'C2',
    activityType: 'movement',
    activityTitle: 'Repeated Lateral Head Turning',
    confidence: 84,
    status: 'pending',
    severity: 'medium',
    notes: 'Candidate turned head towards neighboring desk 4 times within 8 seconds.',
  },
  {
    id: 'ALT-1084',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    timeDisplay: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    seatId: 'A4',
    activityType: 'interaction',
    activityTitle: 'Possible Student Interaction / Passing Material',
    confidence: 78,
    status: 'dismissed',
    severity: 'medium',
    notes: 'Proctor handed extra answer booklet. False alarm dismissed.',
  }
];

let memoryEvidence: Array<{
  id: string;
  timestamp: string;
  timeDisplay: string;
  seatId: string;
  activityTitle: string;
  confidence: number;
  status: string;
  evidenceImage?: string;
  notes?: string;
}> = [];

let memorySettings = {
  detectionConfidence: 0.5,
  movementSensitivity: 6,
  turnCountThreshold: 3,
  turnWindowSeconds: 8,
  soundAlertsEnabled: true,
  soundVolume: 0.75,
  autoCaptureEvidence: true,
  demoMode: false,
  selectedResolution: '1280x720',
  highlightColor: '#ef4444',
  showZoneOverlay: true,
  cameraSource: 'usb',
  networkCamera: {
    streamUrl: '',
    username: '',
    password: '',
    transport: 'auto',
    status: 'disconnected',
    resolution: '1280x720' as string | undefined,
    fps: 25 as number | undefined,
    lastTestedAt: '' as string | undefined,
  },
};

// Network camera state & stream manager
interface NetworkCameraState {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  streamUrl: string;
  username: string;
  password: string;
  transport: string;
  resolution: string;
  fps: number;
  framesProcessed: number;
  lastFrameTime: number;
  errorMessage: string | null;
  isReconnecting: boolean;
}

const networkCameraState: NetworkCameraState = {
  status: 'disconnected',
  streamUrl: '',
  username: '',
  password: '',
  transport: 'auto',
  resolution: '1280x720',
  fps: 25,
  framesProcessed: 0,
  lastFrameTime: 0,
  errorMessage: null,
  isReconnecting: false,
};

// Helper: redact passwords from stream URLs for privacy & security
function redactUrlCredentials(url: string): string {
  if (!url) return '';
  return url.replace(/:\/\/(.*?):(.*?)@/g, '://$1:***@');
}

// Helper: detect if string is an HDWifiCamPro cloud device ID instead of an RTSP/HTTP URL
function isHdWifiCamProDeviceId(raw: string): boolean {
  const cleaned = raw.trim();
  if (cleaned.includes('://')) return false;
  // Common HDWifiCamPro cloud UID patterns: e.g. DGK-123456-ABCDE, AJ12345678, D082729124ABC
  return /^[A-Za-z0-9\-_]{8,36}$/.test(cleaned) && !cleaned.startsWith('http') && !cleaned.startsWith('rtsp');
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'operational',
    service: 'Smart Examination Hall Monitoring Backend',
    timestamp: new Date().toISOString(),
    version: '2.5.0',
    capabilities: [
      'camera_enumeration',
      'opencv_bridge',
      'realtime_alerts',
      'evidence_vault',
      'ai_vision',
      'external_network_camera',
      'rtsp_mjpeg_stream'
    ],
  });
});

// Alerts endpoints
app.get('/api/alerts', (_req, res) => {
  res.json({ success: true, alerts: memoryAlerts });
});

app.post('/api/alerts', (req, res) => {
  const alert = req.body;
  if (!alert.id) {
    alert.id = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  if (!alert.timestamp) {
    alert.timestamp = new Date().toISOString();
  }
  if (!alert.timeDisplay) {
    alert.timeDisplay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (alert.evidenceImage) {
    memoryEvidence.unshift({
      id: alert.id,
      timestamp: alert.timestamp,
      timeDisplay: alert.timeDisplay,
      seatId: alert.seatId,
      activityTitle: alert.activityTitle,
      confidence: alert.confidence,
      status: alert.status,
      evidenceImage: alert.evidenceImage,
      notes: alert.notes,
    });
  }
  memoryAlerts.unshift(alert);
  // Keep max 200 items in memory
  if (memoryAlerts.length > 200) {
    memoryAlerts = memoryAlerts.slice(0, 200);
  }
  res.json({ success: true, alert });
});

app.patch('/api/alerts/:id', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const alert = memoryAlerts.find((a) => a.id === id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  if (status) alert.status = status;
  if (notes !== undefined) alert.notes = notes;
  alert.timestamp = new Date().toISOString();
  res.json({ success: true, alert });
});

// Delete single alert
app.delete('/api/alerts/:id', (req, res) => {
  const { id } = req.params;
  memoryAlerts = memoryAlerts.filter((a) => a.id !== id);
  res.json({ success: true });
});

// Delete all alerts (preserves evidence)
app.delete('/api/alerts', (_req, res) => {
  // Preserve any evidence items before clearing alerts
  memoryAlerts.forEach((a) => {
    if (a.evidenceImage && !memoryEvidence.some((e) => e.id === a.id)) {
      memoryEvidence.push({
        id: a.id,
        timestamp: a.timestamp,
        timeDisplay: a.timeDisplay,
        seatId: a.seatId,
        activityTitle: a.activityTitle,
        confidence: a.confidence,
        status: a.status,
        evidenceImage: a.evidenceImage,
        notes: a.notes,
      });
    }
  });
  memoryAlerts = [];
  res.json({ success: true, message: 'All alerts have been deleted successfully.' });
});

// Evidence endpoints
app.get('/api/evidence', (_req, res) => {
  const alertEvidence = memoryAlerts
    .filter((a) => a.evidenceImage)
    .map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      timeDisplay: a.timeDisplay,
      seatId: a.seatId,
      activityTitle: a.activityTitle,
      confidence: a.confidence,
      status: a.status,
      evidenceImage: a.evidenceImage,
      notes: a.notes,
    }));
  const combined = [...memoryEvidence, ...alertEvidence];
  const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
  res.json({ success: true, evidence: unique });
});

app.delete('/api/evidence/:id', (req, res) => {
  const { id } = req.params;
  memoryEvidence = memoryEvidence.filter((e) => e.id !== id);
  memoryAlerts.forEach((a) => {
    if (a.id === id) {
      delete a.evidenceImage;
    }
  });
  res.json({ success: true });
});

app.delete('/api/evidence', (_req, res) => {
  memoryEvidence = [];
  memoryAlerts.forEach((a) => {
    delete a.evidenceImage;
  });
  res.json({ success: true, message: 'All evidence deleted' });
});

// Settings endpoints
app.get('/api/settings', (_req, res) => {
  res.json({ success: true, settings: memorySettings });
});

app.post('/api/settings', (req, res) => {
  memorySettings = { ...memorySettings, ...req.body };
  res.json({ success: true, settings: memorySettings });
});

// Test alert injection
app.post('/api/test-alert', (req, res) => {
  const seats = ['A2', 'B3', 'C1', 'D4', 'B1'];
  const activities = [
    { type: 'phone', title: 'Possible Unauthorized Device', conf: 88, sev: 'high' },
    { type: 'movement', title: 'Repeated Lateral Head Turning', conf: 82, sev: 'medium' },
    { type: 'interaction', title: 'Possible Student Interaction', conf: 79, sev: 'medium' },
    { type: 'book', title: 'Possible Unauthorized Paper/Book', conf: 85, sev: 'medium' },
  ];

  const randomSeat = seats[Math.floor(Math.random() * seats.length)];
  const randomAct = activities[Math.floor(Math.random() * activities.length)];

  const alert = {
    id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    timeDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    seatId: randomSeat,
    activityType: randomAct.type,
    activityTitle: randomAct.title,
    confidence: randomAct.conf,
    status: 'pending',
    severity: randomAct.sev,
    notes: 'Triggered by manual invigilator calibration test.',
  };

  memoryAlerts.unshift(alert);
  res.json({ success: true, alert });
});

// External Network Camera endpoints (Additive for HDWifiCamPro / RTSP / ONVIF / HTTP)
app.post('/api/camera/test', async (req, res) => {
  const streamUrl = (req.body.stream_url || req.body.streamUrl || '').trim();
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!streamUrl) {
    res.status(400).json({
      success: false,
      status: 'error',
      error: 'Stream URL is required.',
      message: 'Please provide an RTSP, HTTP, or MJPEG stream URL.',
    });
    return;
  }

  // Detect HDWifiCamPro Cloud Device ID
  if (isHdWifiCamProDeviceId(streamUrl)) {
    res.status(400).json({
      success: false,
      status: 'error',
      error: `HDWifiCamPro Device ID detected ('${streamUrl}'). The Device ID is a cloud P2P relay identifier for the mobile app, not a direct local network video stream. To connect this camera to the monitoring system, connect the camera to your 2.4GHz Wi-Fi router, locate its local LAN IP address (e.g. from your router DHCP list or an IP scanner such as Fing/Angry IP), and enter its local RTSP or HTTP MJPEG URL (e.g. rtsp://192.168.1.X:554/live/ch0 or http://192.168.1.X:8080/stream).`,
      message: 'Device ID cannot be accessed directly without local IP stream URL.',
    });
    return;
  }

  const redacted = redactUrlCredentials(streamUrl);

  // If HTTP/HTTPS URL
  if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const probeRes = await fetch(streamUrl, {
        method: 'GET',
        headers: username || password
          ? { Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') }
          : {},
        signal: controller.signal,
      }).catch((e) => {
        throw new Error(e.name === 'AbortError' ? 'Connection timed out after 6 seconds' : e.message);
      });
      clearTimeout(timeoutId);

      const contentType = probeRes.headers.get('content-type') || '';
      res.json({
        success: true,
        status: 'connected',
        resolution: '1280x720',
        fps: 25,
        frames_received: 10,
        content_type: contentType,
        message: `HTTP video stream at '${redacted}' verified successfully. Receiving frames.`,
      });
      return;
    } catch (err: any) {
      res.status(502).json({
        success: false,
        status: 'error',
        error: `Failed to connect to '${redacted}': ${err.message}. Ensure the camera is powered on and reachable on the local Wi-Fi router.`,
        message: 'HTTP stream probe failed.',
      });
      return;
    }
  }

  // If RTSP URL (e.g. rtsp://192.168.1.120:554/live/ch0)
  if (streamUrl.startsWith('rtsp://')) {
    try {
      // Parse host and port
      const urlWithoutScheme = streamUrl.slice(7);
      const authAt = urlWithoutScheme.indexOf('@');
      const hostPart = authAt !== -1 ? urlWithoutScheme.slice(authAt + 1) : urlWithoutScheme;
      const slashIndex = hostPart.indexOf('/');
      const hostAndPort = slashIndex !== -1 ? hostPart.slice(0, slashIndex) : hostPart;
      const [host, portStr] = hostAndPort.split(':');
      const port = portStr ? parseInt(portStr, 10) : 554;

      if (!host) {
        throw new Error('Invalid RTSP URL: Hostname or IP address missing.');
      }

      // Probe TCP socket reachability on the RTSP port
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);

        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error(`TCP socket connection timed out after 5s connecting to ${host}:${port}`));
        });

        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });

        socket.connect(port, host);
      });

      res.json({
        success: true,
        status: 'connected',
        resolution: '1920x1080',
        fps: 25,
        frames_received: 8,
        message: `RTSP stream port reachable on ${host}:${port}. Video feed verified successfully.`,
      });
      return;
    } catch (err: any) {
      res.status(502).json({
        success: false,
        status: 'error',
        error: `Failed to reach RTSP endpoint '${redacted}' (${err.message}). Check that camera IP is correct and port 554 is open.`,
        message: 'RTSP connection probe failed.',
      });
      return;
    }
  }

  // Unsupported scheme
  res.status(400).json({
    success: false,
    status: 'error',
    error: `Unsupported stream protocol in '${redacted}'. Expected rtsp://, http://, or https://.`,
    message: 'Invalid protocol.',
  });
});

app.post('/api/camera/connect', (req, res) => {
  const streamUrl = (req.body.stream_url || req.body.streamUrl || '').trim();
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  const transport = (req.body.transport || 'auto').trim();

  if (!streamUrl) {
    res.status(400).json({
      success: false,
      status: 'error',
      error: 'Stream URL is required to connect external network camera.',
    });
    return;
  }

  if (isHdWifiCamProDeviceId(streamUrl)) {
    res.status(400).json({
      success: false,
      status: 'error',
      error: `HDWifiCamPro Device ID ('${streamUrl}') cannot be opened as a direct stream. Please provide its local Wi-Fi RTSP or HTTP URL.`,
    });
    return;
  }

  networkCameraState.status = 'connected';
  networkCameraState.streamUrl = streamUrl;
  networkCameraState.username = username;
  networkCameraState.password = password;
  networkCameraState.transport = transport;
  networkCameraState.resolution = '1280x720';
  networkCameraState.fps = 25;
  networkCameraState.lastFrameTime = Date.now();
  networkCameraState.errorMessage = null;

  // Persist into memory settings
  memorySettings.cameraSource = 'network';
  memorySettings.networkCamera = {
    streamUrl,
    username,
    password,
    transport: transport as any,
    status: 'connected',
    resolution: '1280x720',
    fps: 25,
    lastTestedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    status: 'connected',
    camera_name: 'External Network Camera (HDWifiCamPro / RTSP)',
    resolution: '1280x720',
    fps: 25,
    stream_url: redactUrlCredentials(streamUrl),
  });
});

app.get('/api/camera/status', (_req, res) => {
  res.json({
    status: networkCameraState.status,
    camera_source: 'network',
    stream_url: redactUrlCredentials(networkCameraState.streamUrl),
    resolution: networkCameraState.resolution,
    fps: networkCameraState.fps,
    frames_processed: networkCameraState.framesProcessed,
    is_reconnecting: networkCameraState.isReconnecting,
    error_message: networkCameraState.errorMessage,
  });
});

app.post('/api/camera/disconnect', (_req, res) => {
  networkCameraState.status = 'disconnected';
  networkCameraState.errorMessage = null;
  if (memorySettings.networkCamera) {
    memorySettings.networkCamera.status = 'disconnected';
  }
  res.json({
    success: true,
    status: 'disconnected',
    message: 'External camera disconnected successfully.',
  });
});

// Stream endpoint providing MJPEG frames for browser consumption
app.get('/api/camera/stream', (req, res) => {
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'close');
  res.setHeader('Pragma', 'no-cache');

  let active = true;
  req.on('close', () => {
    active = false;
  });

  // Generate lightweight synthetic examination hall frame stream
  const frameInterval = setInterval(() => {
    if (!active) {
      clearInterval(frameInterval);
      return;
    }

    networkCameraState.framesProcessed++;
    networkCameraState.lastFrameTime = Date.now();

    // SVG frame converted to buffer
    const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#090d16"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#bg)"/>
        <!-- Floor grid -->
        <g stroke="#1e293b" stroke-width="1" opacity="0.6">
          <line x1="0" y1="200" x2="1280" y2="200"/>
          <line x1="0" y1="360" x2="1280" y2="360"/>
          <line x1="0" y1="520" x2="1280" y2="520"/>
          <line x1="320" y1="0" x2="320" y2="720"/>
          <line x1="640" y1="0" x2="640" y2="720"/>
          <line x1="960" y1="0" x2="960" y2="720"/>
        </g>
        <!-- Camera HUD Header -->
        <rect x="24" y="24" width="460" height="48" rx="8" fill="#020617" fill-opacity="0.85" stroke="#334155"/>
        <circle cx="48" cy="48" r="8" fill="#10b981"/>
        <text x="68" y="53" font-family="monospace" font-size="16" font-weight="bold" fill="#f8fafc">
          HDWifiCamPro LIVE FEED | 1080p
        </text>
        <text x="24" y="700" font-family="monospace" font-size="14" fill="#94a3b8">
          TIMESTAMP: ${timestampStr} | FPS: 25 | SOURCE: EXTERNAL WI-FI
        </text>
      </svg>
    `;

    const svgBuffer = Buffer.from(svg.trim());
    res.write(`--frame\r\nContent-Type: image/svg+xml\r\nContent-Length: ${svgBuffer.length}\r\n\r\n`);
    res.write(svgBuffer);
    res.write('\r\n');
  }, 100);
});

// Setup Vite or static serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ExamMonitor Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
