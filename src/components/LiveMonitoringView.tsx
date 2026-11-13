import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Play,
  Pause,
  RefreshCw,
  Maximize2,
  Grid3X3,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Radio,
  CameraOff,
  Sparkles,
  Smartphone,
  RotateCcw,
  Users,
  ShieldAlert,
  FileText,
  Timer,
} from 'lucide-react';
import { AlertItem, DetectedBoundingBox, HallStats, SeatZone, SystemSettings } from '../types';
import { soundService } from '../services/soundService';
import { useExamSessionTimer } from '../hooks/useExamSessionTimer';

interface LiveMonitoringViewProps {
  stats: HallStats;
  settings: SystemSettings;
  seats: SeatZone[];
  alerts: AlertItem[];
  detectedBoxes: DetectedBoundingBox[];
  activeAlert: AlertItem | null;
  onConnectCamera: () => void;
  onDisconnectCamera: () => void;
  onToggleMonitoring: () => void;
  onRefreshCameras: () => void;
  onDismissAlert: (id: string) => void;
  onReviewAlert: (id: string, notes?: string) => void;
  onViewEvidence: (alert: AlertItem) => void;
  onTriggerTestEvent: () => void;
  onTestCheatSheet?: () => void;
  onCaptureManualSnapshot: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDemoMode: boolean;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  stats,
  settings,
  seats,
  alerts,
  detectedBoxes,
  activeAlert,
  onConnectCamera,
  onDisconnectCamera,
  onToggleMonitoring,
  onRefreshCameras,
  onDismissAlert,
  onReviewAlert,
  onViewEvidence,
  onTriggerTestEvent,
  onTestCheatSheet,
  onCaptureManualSnapshot,
  videoRef,
  canvasRef,
  containerRef,
  isDemoMode,
}) => {
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<SeatZone | null>(null);

  const { formattedTime } = useExamSessionTimer();

  // Toggle fullscreen for surveillance monitoring
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="space-y-4">
      {/* Real-time Alert Popup Banner if active alert exists */}
      {activeAlert && activeAlert.status === 'pending' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950 via-rose-900/90 to-red-950 border-2 border-rose-500 shadow-2xl shadow-rose-950/80 animate-pulse-glow flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-rose-600 text-white animate-bounce shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-black tracking-wider bg-rose-600 text-white uppercase">
                  {activeAlert.activityType === 'cheat_sheet' || activeAlert.activityType === 'unauthorized_paper'
                    ? '🚨 POSSIBLE UNAUTHORIZED MATERIAL'
                    : '🚨 POSSIBLE SUSPICIOUS ACTIVITY'}
                </span>
                <span className="font-mono text-sm font-black text-rose-200 bg-slate-900 px-2 py-0.5 rounded border border-rose-700">
                  SEAT: {activeAlert.seatId}
                </span>
              </div>
              <div className="text-white font-bold text-base md:text-lg mt-0.5">
                {activeAlert.activityTitle}
              </div>
              <div className="text-xs text-rose-200 flex items-center gap-3 mt-1 font-mono">
                <span>Time: {activeAlert.timeDisplay}</span>
                <span>•</span>
                <span>Confidence: {activeAlert.confidence}%</span>
                <span>•</span>
                <span className="text-rose-300 italic">{activeAlert.notes || 'Automated visual AI flag'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            {activeAlert.evidenceImage && (
              <button
                onClick={() => onViewEvidence(activeAlert)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold border border-rose-600/50 flex items-center gap-1.5 shadow"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                VIEW EVIDENCE
              </button>
            )}

            <button
              onClick={() => onReviewAlert(activeAlert.id)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              REVIEW
            </button>

            <button
              onClick={() => onDismissAlert(activeAlert.id)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Main Monitoring Screen & Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Large Live Camera Panel (Focus of application) */}
        <div
          ref={containerRef}
          className={`xl:col-span-9 bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative shadow-2xl ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
          }`}
        >
          {/* Top HUD bar */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    stats.cameraStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                ></span>
                <span className="font-bold text-white tracking-wide">LIVE EXAMINATION HALL</span>
              </div>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-mono">Camera: {stats.cameraName}</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-mono">Res: {stats.resolution}</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-mono">FPS: {stats.fps}</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-300 font-mono font-bold flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-emerald-600/40">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exam Time: {formattedTime}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                  stats.monitoringStatus === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                STATUS: {stats.cameraStatus === 'connected' ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
              </span>

              {isDemoMode && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-900/50 text-purple-300 border border-purple-500/40">
                  DEMO SIMULATION
                </span>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Toggle Fullscreen Surveillance Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actual Video Screen Viewport with Canvas Overlay */}
          <div className="relative flex-1 min-h-[460px] md:min-h-[520px] bg-black flex items-center justify-center overflow-hidden">
            {/* If camera is disconnected banner */}
            {stats.cameraStatus !== 'connected' && !isDemoMode && (
              <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-950/80 border-2 border-rose-600 flex items-center justify-center text-rose-500 animate-pulse">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-rose-400 tracking-tight font-mono">
                    🔴 CAMERA DISCONNECTED
                  </h3>
                  <p className="text-sm text-slate-300 max-w-md">
                    Monitoring has been paused. Please connect your USB camera or enable your laptop webcam.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onConnectCamera}
                    className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-950/80 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    CONNECT CAMERA
                  </button>
                  <button
                    onClick={onRefreshCameras}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    REFRESH CAMERAS
                  </button>
                </div>
              </div>
            )}

            {/* Real Camera Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Real-time Bounding Box & HUD Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
            />

            {/* Optional Zone Grid Overlay across video */}
            {showGridOverlay && stats.cameraStatus === 'connected' && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-4 grid-rows-4 z-15 border border-cyan-500/20">
                {seats.map((seat) => (
                  <div
                    key={seat.id}
                    className="border border-cyan-500/15 p-1.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-slate-950/70 text-cyan-300 border border-cyan-500/30">
                        {seat.id}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          seat.status === 'alert'
                            ? 'bg-rose-500 animate-ping'
                            : seat.status === 'suspicious'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      ></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent h-16 animate-scanline z-20"></div>

            {/* Floating Live Telemetry Badge inside feed */}
            {stats.cameraStatus === 'connected' && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur border border-slate-700/80 text-[11px] font-mono text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  REC | {stats.resolution} | {stats.fps} FPS
                </span>

                <span className="px-2 py-1 rounded-md bg-slate-950/80 backdrop-blur border border-slate-700/80 text-[11px] font-mono text-cyan-300">
                  AI DETECTIONS: {detectedBoxes.length} TARGETS
                </span>
              </div>
            )}
          </div>

          {/* Bottom Live Camera Controls */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {stats.cameraStatus === 'connected' ? (
                <button
                  onClick={onDisconnectCamera}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60 font-medium text-xs flex items-center gap-1.5 transition-all"
                >
                  <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                  Disconnect Camera
                </button>
              ) : (
                <button
                  onClick={onConnectCamera}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Connect Camera
                </button>
              )}

              <button
                onClick={onToggleMonitoring}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
                  stats.monitoringStatus === 'active'
                    ? 'bg-amber-600/90 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {stats.monitoringStatus === 'active' ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Stop Monitoring
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Start Monitoring
                  </>
                )}
              </button>

              <button
                onClick={onRefreshCameras}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700"
                title="Rescan USB ports and video inputs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Cameras
              </button>

              <button
                onClick={() => setShowGridOverlay(!showGridOverlay)}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border transition-all ${
                  showGridOverlay
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                {showGridOverlay ? 'Zone Grid: ON' : 'Zone Grid: OFF'}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onCaptureManualSnapshot}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5"
                title="Capture instant evidential screenshot"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" /> Manual Snapshot
              </button>

              <button
                onClick={onTriggerTestEvent}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/50"
                title="Simulate candidate looking at phone to test alarm flow"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Test Device / Glance
              </button>

              {onTestCheatSheet && (
                <button
                  onClick={onTestCheatSheet}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600 font-bold text-xs flex items-center gap-1.5 shadow"
                  title="Simulate candidate B4 with unauthorized cheat slip"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" /> Test Cheat Sheet (B4)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Seating Hall Status & Live Detections Log */}
        <div className="xl:col-span-3 space-y-4">
          {/* Seating Layout Live Status Pill Board */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Grid3X3 className="w-3.5 h-3.5 text-cyan-400" />
                Desk Zone Matrix
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {stats.cameraStatus === 'connected' && stats.monitoringStatus === 'active'
                  ? '16 Desks (Active)'
                  : stats.cameraStatus === 'connected'
                  ? 'Monitoring Paused'
                  : 'Camera Disconnected'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 my-2">
              {seats.map((seat) => {
                const isCameraConnected = stats.cameraStatus === 'connected';
                const isMonitoringActive = stats.monitoringStatus === 'active';

                let statusLabel = 'NOT MONITORED';
                let cardClass = 'bg-slate-950/40 text-slate-500 border-slate-800/60 opacity-60 hover:border-slate-700';
                let textClass = 'text-slate-500 font-normal';

                if (!isCameraConnected) {
                  statusLabel = 'NOT MONITORED';
                  cardClass = 'bg-slate-950/40 text-slate-500 border-slate-800/60 opacity-60 hover:border-slate-700';
                  textClass = 'text-slate-500 font-normal';
                } else if (!isMonitoringActive) {
                  statusLabel = 'MONITORING PAUSED';
                  cardClass = 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700';
                  textClass = 'text-slate-400 font-medium';
                } else {
                  // Both camera connected AND monitoring active
                  const isAlert = seat.status === 'alert';
                  const isSus = seat.status === 'suspicious';

                  if (isAlert) {
                    statusLabel = 'ALERT';
                    cardClass = 'bg-rose-600/30 text-rose-200 border-rose-500 animate-pulse font-bold';
                    textClass = 'text-rose-400 font-bold';
                  } else if (isSus) {
                    statusLabel = 'SUSPICIOUS';
                    cardClass = 'bg-amber-600/20 text-amber-200 border-amber-500/50 font-semibold';
                    textClass = 'text-amber-400 font-semibold';
                  } else {
                    statusLabel = 'NORMAL';
                    cardClass = 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700';
                    textClass = 'text-emerald-400 font-medium';
                  }
                }

                return (
                  <button
                    key={seat.id}
                    onClick={() => setSelectedSeatDetails(seat)}
                    className={`p-1.5 rounded text-center border font-mono transition-all flex flex-col justify-center items-center min-h-[50px] ${cardClass}`}
                  >
                    <div className="text-xs font-bold">{seat.id}</div>
                    <div className={`text-[8px] uppercase mt-0.5 leading-tight ${textClass}`}>
                      {statusLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedSeatDetails && (
              <div className="mt-3 p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-white">
                  <span>Zone: {selectedSeatDetails.id}</span>
                  <span className="text-cyan-400">{selectedSeatDetails.assignedStudentCode}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Status:{' '}
                  <span className="text-slate-200 font-medium">
                    {stats.cameraStatus !== 'connected'
                      ? 'Not Monitored (Camera Disconnected)'
                      : stats.monitoringStatus !== 'active'
                      ? 'Monitoring Paused'
                      : selectedSeatDetails.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Coordinates: X: {(selectedSeatDetails.x * 100).toFixed(0)}%, Y: {(selectedSeatDetails.y * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {/* Active AI Detections in Current Frame */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Live Vision Detections
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {detectedBoxes.length} items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {detectedBoxes.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs">
                  {stats.cameraStatus === 'connected'
                    ? 'Scanning video feed for candidates...'
                    : 'Camera offline'}
                </div>
              ) : (
                detectedBoxes.map((box) => (
                  <div
                    key={box.id}
                    className={`p-2 rounded border text-xs flex items-center justify-between ${
                      box.isSuspicious
                        ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
                        : box.isOfficial
                        ? 'bg-emerald-950/30 border-emerald-600/50 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          box.isSuspicious
                            ? 'bg-rose-500 animate-ping'
                            : box.isOfficial
                            ? 'bg-emerald-400'
                            : 'bg-cyan-400'
                        }`}
                      ></span>
                      <div>
                        <div className="font-semibold flex items-center gap-1">
                          <span className="capitalize">
                            {box.paperClassificationLabel || box.class}
                          </span>
                          {box.seatId && (
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-200">
                              {box.seatId}
                            </span>
                          )}
                          {box.isOfficial && (
                            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono uppercase">
                              Official
                            </span>
                          )}
                        </div>
                        {box.suspicionReason && (
                          <div className="text-[10px] text-rose-300 font-medium">
                            {box.suspicionReason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {(box.score * 100).toFixed(0)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              Invigilator Notice
            </div>
            <p className="text-[11px] leading-relaxed">
              When suspicious activity (phone, note-passing, repeated head turning) is detected, an automatic screenshot
              is preserved in the <strong>Evidence Vault</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
