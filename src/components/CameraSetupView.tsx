import React, { useState } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Play,
  Pause,
  ExternalLink,
  Laptop,
  Usb,
  ShieldCheck,
  Video,
  Wifi,
  User,
  Lock,
  Info,
} from 'lucide-react';
import { CameraDevice, CameraSourceType, HallStats, NetworkCameraConfig, SystemSettings } from '../types';
import { cameraManager } from '../services/cameraManager';

interface CameraSetupViewProps {
  availableCameras: CameraDevice[];
  selectedCameraId: string | null;
  setSelectedCameraId: (id: string) => void;
  stats: HallStats;
  settings: SystemSettings;
  setSettings: (settings: SystemSettings) => void;
  onConnectCamera: (deviceId?: string) => void;
  onConnectNetworkCamera?: (customConfig?: NetworkCameraConfig) => Promise<void> | void;
  onDisconnectCamera: () => void;
  onRefreshCameras: () => void;
  onStartMonitoring: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
}

export const CameraSetupView: React.FC<CameraSetupViewProps> = ({
  availableCameras,
  selectedCameraId,
  setSelectedCameraId,
  stats,
  settings,
  setSettings,
  onConnectCamera,
  onConnectNetworkCamera,
  onDisconnectCamera,
  onRefreshCameras,
  onStartMonitoring,
  videoRef,
  isDemoMode,
  setIsDemoMode,
}) => {
  const [resolution, setResolution] = useState<'1920x1080' | '1280x720' | '640x480'>(
    settings.selectedResolution || '1280x720'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isTestingStream, setIsTestingStream] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    resolution?: string;
    fps?: number;
  } | null>(null);

  const currentSource: CameraSourceType = isDemoMode
    ? 'demo'
    : settings.cameraSource || 'usb';

  const handleSourceChange = (newSource: CameraSourceType) => {
    if (newSource === 'demo') {
      setIsDemoMode(true);
      setSettings({ ...settings, cameraSource: 'demo', demoMode: true });
    } else {
      setIsDemoMode(false);
      setSettings({ ...settings, cameraSource: newSource, demoMode: false });
    }
  };

  const handleNetworkFieldChange = (field: keyof NetworkCameraConfig, value: string) => {
    const currentNet: NetworkCameraConfig = settings.networkCamera || {
      streamUrl: '',
      username: '',
      password: '',
      transport: 'auto',
      status: 'disconnected',
    };
    setSettings({
      ...settings,
      networkCamera: {
        ...currentNet,
        [field]: value,
      },
    });
  };

  const handleTestNetworkStream = async () => {
    const streamUrl = settings.networkCamera?.streamUrl?.trim() || '';
    if (!streamUrl) {
      setTestResult({
        success: false,
        message: 'Please enter a stream URL (e.g. rtsp://192.168.1.X:554/live/ch0 or http://192.168.1.X:8080/stream).',
      });
      return;
    }

    setIsTestingStream(true);
    setTestResult(null);

    try {
      const res = await cameraManager.testNetworkCamera({
        streamUrl,
        username: settings.networkCamera?.username || '',
        password: settings.networkCamera?.password || '',
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Stream verified successfully. Frames arriving normally.',
          resolution: res.resolution,
          fps: res.fps,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || res.message || 'Stream connection failed.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection error: ${err.message || 'Could not reach backend service.'}`,
      });
    } finally {
      setIsTestingStream(false);
    }
  };

  const handleRefresh = async () => {
    setIsScanning(true);
    await onRefreshCameras();
    setTimeout(() => setIsScanning(false), 600);
  };

  const handleConnect = async () => {
    if (currentSource === 'network') {
      if (onConnectNetworkCamera) {
        await onConnectNetworkCamera();
      }
    } else {
      onConnectCamera(selectedCameraId || undefined);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">
            <Camera className="w-5 h-5 text-rose-500" />
            CAMERA SETUP & HARDWARE CONFIGURATION
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detect and connect real USB webcams and laptop integrated cameras for automated examination hall computer vision.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isScanning}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
          {isScanning ? 'Scanning Hardware...' : 'REFRESH CAMERAS'}
        </button>
      </div>

      {/* Main Setup Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Camera Selection and Connection */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            {/* Camera Source Selector Dropdown */}
            <div className="space-y-1.5 pb-3 border-b border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Camera Source
              </label>
              <select
                value={currentSource}
                onChange={(e) => handleSourceChange(e.target.value as CameraSourceType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="network">External Network Camera (HDWifiCamPro / Wi-Fi / RTSP)</option>
                <option value="usb">USB Camera (External Hardware)</option>
                <option value="integrated">Laptop Webcam (Integrated)</option>
                <option value="demo">Demo Mode (Simulated Examination Hall)</option>
              </select>
            </div>

            {currentSource === 'network' ? (
              /* Network Camera Configuration */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-rose-500" />
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                      HDWifiCamPro / RTSP Stream Configuration
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300">
                    WI-FI STREAM
                  </span>
                </div>

                {/* Stream URL */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Camera Stream URL
                  </label>
                  <input
                    type="text"
                    value={settings.networkCamera?.streamUrl || ''}
                    onChange={(e) => handleNetworkFieldChange('streamUrl', e.target.value)}
                    placeholder="rtsp://192.168.1.120:554/live/ch0 or http://192.168.1.120:8080/stream"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    RTSP, HTTP/MJPEG, or ONVIF endpoint on your Wi-Fi router.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Username (Optional)
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={settings.networkCamera?.username || ''}
                        onChange={(e) => handleNetworkFieldChange('username', e.target.value)}
                        placeholder="admin"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password (Optional)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="password"
                        value={settings.networkCamera?.password || ''}
                        onChange={(e) => handleNetworkFieldChange('password', e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestNetworkStream}
                    disabled={isTestingStream}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingStream ? 'animate-spin text-cyan-400' : ''}`} />
                    {isTestingStream ? 'Testing Stream...' : 'Test Connection'}
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold">{testResult.message}</div>
                      {testResult.resolution && (
                        <div className="text-[10px] text-slate-400">
                          Resolution: {testResult.resolution} | FPS: ~{testResult.fps || 25}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    HDWifiCamPro Device ID Information
                  </div>
                  <p>
                    The cloud Device ID (e.g. <code className="text-amber-300 font-mono">DGK-XXXXX</code>) is for P2P mobile relay. For local examination hall monitoring, look up the camera's local Wi-Fi IP address on your router (e.g. <code className="text-cyan-300 font-mono">192.168.1.120</code>) and enter its RTSP/HTTP URL.
                  </p>
                </div>
              </div>
            ) : (
              /* Hardware Camera List (USB or Laptop Integrated) */
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    Available Hardware Cameras
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {availableCameras.length} Discovered
                  </span>
                </div>

                {/* If NO cameras detected */}
                {availableCameras.length === 0 && !isDemoMode ? (
                  <div className="p-6 rounded-xl bg-rose-950/40 border-2 border-rose-700/60 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-300 text-base font-mono">
                        🔴 NO CAMERA DETECTED
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                        Please connect a USB camera or enable your laptop webcam permissions in your browser.
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-3">
                      <button
                        onClick={handleRefresh}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> REFRESH CAMERAS
                      </button>
                      <button
                        onClick={() => setIsDemoMode(true)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
                      >
                        Use Demo Mode
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Camera Device List */
                  <div className="space-y-2.5">
                    {availableCameras.map((device, idx) => {
                      const isSelected = selectedCameraId === device.deviceId;
                      const isUsb = device.isUsb;

                      return (
                        <label
                          key={device.deviceId || idx}
                          className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="cameraSelection"
                              checked={isSelected}
                              onChange={() => setSelectedCameraId(device.deviceId)}
                              className="w-4 h-4 text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500"
                            />
                            <div>
                              <div className="font-semibold text-xs md:text-sm text-slate-200 flex items-center gap-2">
                                {isUsb ? (
                                  <Usb className="w-4 h-4 text-cyan-400" />
                                ) : (
                                  <Laptop className="w-4 h-4 text-purple-400" />
                                )}
                                <span>{device.label || `Camera Device ${idx + 1}`}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {isUsb ? 'USB External Hardware' : 'Laptop Integrated Webcam'}
                              </div>
                            </div>
                          </div>

                          {isSelected && stats.cameraStatus === 'connected' && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Resolution Selector */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Camera Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1920x1080', label: '1080p Full HD', desc: 'Highest Detail' },
                  { id: '1280x720', label: '720p HD', desc: 'Optimal (Recommended)' },
                  { id: '640x480', label: '480p SD', desc: 'Ultra-low CPU' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      const resVal = opt.id as '1920x1080' | '1280x720' | '640x480';
                      setResolution(resVal);
                      setSettings({ ...settings, selectedResolution: resVal });
                    }}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      resolution === opt.id
                        ? 'bg-rose-950/30 border-rose-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Actions & Status */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-semibold">Status:</span>
                {stats.cameraStatus === 'connected' ? (
                  <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    🟢 Camera Connected
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold text-sm flex items-center gap-1.5 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    🔴 Camera Disconnected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {stats.cameraStatus === 'connected' ? (
                  <button
                    onClick={onDisconnectCamera}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    DISCONNECT CAMERA
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/80 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    [ CONNECT CAMERA ]
                  </button>
                )}

                <button
                  onClick={onStartMonitoring}
                  disabled={stats.cameraStatus !== 'connected'}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    stats.cameraStatus === 'connected'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/80'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  [ START MONITORING ]
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Camera Viewport Preview & Diagnostics */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-cyan-400" />
                  Live Camera Feed Preview
                </h3>
                {stats.cameraStatus === 'connected' && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    ACTIVE FEED
                  </span>
                )}
              </div>

              {/* Video Preview Frame */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                {stats.cameraStatus === 'connected' ? (
                  <div className="w-full h-full relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[10px] font-mono text-slate-200">
                      {stats.cameraName} | {stats.resolution} | {stats.fps} FPS
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                    <div className="text-xs font-semibold text-slate-400">
                      No video stream active
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Select your camera and click &quot;[ CONNECT CAMERA ]&quot; to inspect the exam hall angle.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hardware Diagnostic Info */}
            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Invigilator Camera Placement Checklist
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Mount camera at elevated angle (2-2.5m) facing exam hall desks.</li>
                <li>Ensure all candidate desks (A1 through D4) are within frame.</li>
                <li>Avoid direct backlight or window glare shining into lens.</li>
                <li>Secure USB connection cable to prevent accidental disconnection.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
