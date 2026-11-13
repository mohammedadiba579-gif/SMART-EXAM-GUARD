import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Camera,
  ShieldCheck,
  RefreshCw,
  BellRing,
  RotateCcw,
  Sparkles,
  Smartphone,
  Save,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Lock,
  User,
  Info,
} from 'lucide-react';
import { CameraSourceType, NetworkCameraConfig, SystemSettings } from '../types';
import { soundService } from '../services/soundService';
import { cameraManager } from '../services/cameraManager';

interface SettingsViewProps {
  settings: SystemSettings;
  setSettings: (settings: SystemSettings) => void;
  onResetDefaults: () => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  onConnectNetworkCamera?: (customConfig?: NetworkCameraConfig) => Promise<void> | void;
  onDisconnectCamera?: () => void;
  cameraStatus?: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  onResetDefaults,
  isDemoMode,
  setIsDemoMode,
  onConnectNetworkCamera,
  onDisconnectCamera,
  cameraStatus = 'disconnected',
}) => {
  const [isTestingStream, setIsTestingStream] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    resolution?: string;
    fps?: number;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleTestAudio = () => {
    soundService.playAlertSiren('high');
  };

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

  const handleNetworkConfigChange = (field: keyof NetworkCameraConfig, value: string) => {
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

  const handleTestConnection = async () => {
    const streamUrl = settings.networkCamera?.streamUrl?.trim() || '';
    if (!streamUrl) {
      setTestResult({
        success: false,
        message: 'Please enter a stream URL to test (e.g. rtsp://192.168.1.120:554/live/ch0 or http://192.168.1.120:8080/stream).',
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
        message: `Connection test error: ${err.message || 'Could not contact camera service.'}`,
      });
    } finally {
      setIsTestingStream(false);
    }
  };

  const handleConnect = async () => {
    if (!onConnectNetworkCamera) return;
    setIsConnecting(true);
    try {
      await onConnectNetworkCamera();
    } finally {
      setIsConnecting(false);
    }
  };

  const isNetworkConnected = cameraStatus === 'connected' && currentSource === 'network';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-rose-500" />
            Detection Parameters & System Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure computer vision thresholds, movement time windows, audio alarms, and surveillance policies.
          </p>
        </div>

        <button
          onClick={onResetDefaults}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset Default Thresholds
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Computer Vision & Object Detection Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              AI Vision & Object Detection
            </h3>
          </div>

          {/* AI Confidence Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Detection Confidence Threshold</span>
              <span className="font-mono text-cyan-400 font-bold">
                {(settings.detectionConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.85"
              step="0.05"
              value={settings.detectionConfidence}
              onChange={(e) =>
                setSettings({ ...settings, detectionConfidence: parseFloat(e.target.value) })
              }
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Higher value prevents false positives; lower value increases sensitivity to distant desks.
            </p>
          </div>

          {/* Automatic Evidence Screenshot Capture */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Auto-Capture Evidential Snapshot
              </span>
              <span className="text-[11px] text-slate-500">
                Instantly store high-res camera frame when suspicious event triggers.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCaptureEvidence}
              onChange={(e) =>
                setSettings({ ...settings, autoCaptureEvidence: e.target.checked })
              }
              className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Suspicious Movement & Pose Analysis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Movement & Head-Turn Logic
            </h3>
          </div>

          {/* Turn Count Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Repeated Turns Threshold</span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.turnCountThreshold} turns
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              step="1"
              value={settings.turnCountThreshold}
              onChange={(e) =>
                setSettings({ ...settings, turnCountThreshold: parseInt(e.target.value) })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Number of repeated glances towards neighbor before triggering a movement alert.
            </p>
          </div>

          {/* Time Window */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Sliding Time Window</span>
              <span className="font-mono text-cyan-400 font-bold">
                {settings.turnWindowSeconds} seconds
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="15"
              step="1"
              value={settings.turnWindowSeconds}
              onChange={(e) =>
                setSettings({ ...settings, turnWindowSeconds: parseInt(e.target.value) })
              }
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Glances outside this time window are dismissed as normal candidate posture shifts.
            </p>
          </div>
        </div>

        {/* Audio Siren Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <BellRing className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Audio Warning Alarm
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Enable Alert Siren Chime
              </span>
              <span className="text-[11px] text-slate-500">
                Audible tone on suspicious unauthorized item or movement.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.soundAlertsEnabled}
              onChange={(e) =>
                setSettings({ ...settings, soundAlertsEnabled: e.target.checked })
              }
              className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestAudio}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Test Alarm Sound
            </button>
          </div>
        </div>

        {/* Operating Mode (Real Camera vs Demo Mode) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Surveillance Mode
            </h3>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Simulated Demo Candidate Mode
                </span>
                <span className="text-[11px] text-slate-400">
                  Enable simulated exam hall candidates if physical camera is unavailable.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => handleSourceChange(e.target.checked ? 'demo' : 'usb')}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 font-mono">
              Note: REAL CAMERA MODE remains the primary operational mode.
            </div>
          </div>
        </div>

        {/* Camera Source & External Network Camera Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Camera Source & Network Stream Settings
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Camera Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  cameraStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {cameraStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Source Selector */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Camera Source
              </label>
              <select
                value={currentSource}
                onChange={(e) => handleSourceChange(e.target.value as CameraSourceType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="network">External Network Camera</option>
                <option value="integrated">Laptop Webcam</option>
                <option value="usb">USB Camera</option>
                <option value="demo">Demo Mode</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Choose between your external Wi-Fi camera (HDWifiCamPro/RTSP), laptop integrated webcam, external USB camera, or simulated demo mode.
              </p>
            </div>

            {/* If External Network Camera is selected, display connection inputs */}
            {currentSource === 'network' && (
              <>
                {/* Stream URL */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Stream URL
                  </label>
                  <input
                    type="text"
                    value={settings.networkCamera?.streamUrl || ''}
                    onChange={(e) => handleNetworkConfigChange('streamUrl', e.target.value)}
                    placeholder="e.g. rtsp://192.168.1.120:554/live/ch0 or http://192.168.1.120:8080/stream"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Supports RTSP, HTTP/MJPEG, and ONVIF streams from your Wi-Fi router. (Do not enter mobile cloud Device ID alone).
                  </p>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={settings.networkCamera?.username || ''}
                      onChange={(e) => handleNetworkConfigChange('username', e.target.value)}
                      placeholder="admin (optional)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={settings.networkCamera?.password || ''}
                      onChange={(e) => handleNetworkConfigChange('password', e.target.value)}
                      placeholder="•••••••• (optional)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="md:col-span-2 pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingStream}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingStream ? 'animate-spin text-cyan-400' : ''}`} />
                    {isTestingStream ? 'Testing Stream...' : 'Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isConnecting ? 'Connecting...' : 'Connect Camera'}
                  </button>

                  <button
                    type="button"
                    onClick={onDisconnectCamera}
                    disabled={cameraStatus !== 'connected'}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
                  >
                    <Square className="w-3.5 h-3.5 text-rose-400" />
                    Disconnect
                  </button>
                </div>

                {/* Test Result Feedback Banner */}
                {testResult && (
                  <div
                    className={`md:col-span-2 p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
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
                        <div className="text-[11px] text-slate-400">
                          Detected Resolution: {testResult.resolution} | FPS: ~{testResult.fps || 25}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* HDWifiCamPro Integration Guide Note */}
                <div className="md:col-span-2 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-400">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    HDWifiCamPro Wi-Fi Setup Guidance
                  </div>
                  <ul className="text-[11px] space-y-1 list-disc list-inside text-slate-400">
                    <li>Connect the camera to your 2.4GHz Wi-Fi router using the HDWifiCamPro mobile app.</li>
                    <li>Check your Wi-Fi router's connected devices list (DHCP clients) or use an IP scanner app to find the camera's local IP address (e.g., <code className="text-cyan-300 font-mono">192.168.1.120</code>).</li>
                    <li>Common HDWifiCamPro RTSP URLs: <code className="text-cyan-300 font-mono">rtsp://192.168.1.X:554/live/ch0</code> or <code className="text-cyan-300 font-mono">rtsp://admin:admin@192.168.1.X:554/onvif1</code>.</li>
                    <li>Note: The cloud Device ID (e.g. <code className="text-amber-300 font-mono">DGK-XXXXX</code>) is for P2P mobile app relay and cannot be opened directly without the camera's local LAN IP.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
