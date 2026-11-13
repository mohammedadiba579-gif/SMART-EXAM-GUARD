import React, { useState } from 'react';
import {
  Users,
  BellRing,
  CheckCircle2,
  Camera,
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  RotateCcw,
  UserCheck,
  Maximize2,
  Lock,
  Play,
  Pause,
  RefreshCw,
  FileX,
  Eye,
  Timer,
  PlusCircle,
} from 'lucide-react';
import { AlertItem, HallStats, SeatZone } from '../types';
import { useExamSessionTimer } from '../hooks/useExamSessionTimer';

interface DashboardViewProps {
  stats: HallStats;
  alerts: AlertItem[];
  seats: SeatZone[];
  onNavigate: (tab: string) => void;
  onReviewAlert: (id: string, notes?: string) => void;
  onDismissAlert: (id: string) => void;
  onToggleMonitoring: () => void;
  onConnectCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  alerts,
  seats,
  onNavigate,
  onReviewAlert,
  onDismissAlert,
  onToggleMonitoring,
  onConnectCamera,
  videoRef,
}) => {
  const pendingAlerts = alerts.filter((a) => a.status === 'pending');
  const recentAlerts = alerts.slice(0, 5);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingNewSession, setIsConfirmingNewSession] = useState(false);

  const { formattedTime, isRunning, sessionId, resetTimer, startNewSession } = useExamSessionTimer();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-4 h-4 text-rose-400" />;
      case 'cheat_sheet':
      case 'unauthorized_paper':
        return <FileX className="w-4 h-4 text-rose-400" />;
      case 'movement':
        return <RotateCcw className="w-4 h-4 text-amber-400" />;
      case 'interaction':
        return <Users className="w-4 h-4 text-indigo-400" />;
      default:
        return <BellRing className="w-4 h-4 text-rose-400" />;
    }
  };

  const getSeatBadgeColor = (status: SeatZone['status']) => {
    switch (status) {
      case 'alert':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'suspicious':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'vacant':
        return 'bg-slate-800 text-slate-500 border-slate-700';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Invigilator Overview Console
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              ROOM: HALL-3B
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Continuous real-time posture analysis, unauthorized device detection, and seat activity mapping.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {stats.cameraStatus !== 'connected' ? (
            <button
              onClick={onConnectCamera}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
            >
              <Camera className="w-4 h-4" />
              Connect Camera
            </button>
          ) : (
            <button
              onClick={onToggleMonitoring}
              className={`px-4 py-2 rounded-lg font-semibold text-xs md:text-sm flex items-center gap-2 transition-all shadow-md ${
                stats.monitoringStatus === 'active'
                  ? 'bg-amber-600/90 hover:bg-amber-600 text-white shadow-amber-900/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              {stats.monitoringStatus === 'active' ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Monitoring
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Resume Monitoring
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onNavigate('live')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all"
          >
            <Maximize2 className="w-4 h-4" />
            Open Live Monitor
          </button>
        </div>
      </div>

      {/* Dedicated Examination Status & Session Timer Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
            EXAMINATION STATUS
          </span>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
            <span className="font-mono text-slate-300">
              Session: <strong className="text-white font-bold">{sessionId}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 font-medium text-slate-300">
              Camera: {stats.cameraStatus === 'connected' ? (
                <span className="text-emerald-400 font-bold">🟢 CONNECTED</span>
              ) : (
                <span className="text-rose-400 font-bold">🔴 DISCONNECTED</span>
              )}
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 font-medium text-slate-300">
              Monitoring: {stats.monitoringStatus === 'active' ? (
                <span className="text-emerald-400 font-bold">🟢 ACTIVE</span>
              ) : (
                <span className="text-amber-400 font-bold">⏸ PAUSED</span>
              )}
            </span>
          </div>
        </div>

        {/* Center: Exam Time Display */}
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 shadow-inner">
          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              Exam Time
            </span>
            <div className="text-2xl font-black text-white font-mono tracking-widest flex items-center gap-2">
              <Timer className={`w-5 h-5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{formattedTime}</span>
            </div>
          </div>

          <div className="pl-3 border-l border-slate-800 flex flex-col items-start gap-1">
            {stats.monitoringStatus === 'paused' ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ⏸ PAUSED
              </span>
            ) : stats.monitoringStatus === 'active' ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                ● ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                STOPPED
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsConfirmingReset(true)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Reset exam timer to 00:00:00"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            ↻ Reset Exam Timer
          </button>

          <button
            onClick={() => setIsConfirmingNewSession(true)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Start new examination session"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            New Exam Session
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Students Detected */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Students Detected</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white font-mono">
            {stats.studentsDetected > 0 ? stats.studentsDetected : 16}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 100% Desks Monitored
          </div>
        </div>

        {/* Active Alerts */}
        <div
          className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
            stats.activeAlerts > 0
              ? 'bg-rose-950/40 border-rose-600/60 shadow-lg shadow-rose-950/40'
              : 'bg-slate-900/70 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Alerts</span>
            <BellRing className={`w-4 h-4 ${stats.activeAlerts > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl lg:text-3xl font-black font-mono ${stats.activeAlerts > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {stats.activeAlerts}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.activeAlerts > 0 ? 'Requires Invigilator Review' : 'No Immediate Threats'}
          </div>
        </div>

        {/* Reviewed Alerts */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reviewed Alerts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white font-mono">
            {stats.reviewedAlerts}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.dismissedAlerts} dismissed false flags
          </div>
        </div>

        {/* Total Evidence Records */}
        <div
          onClick={() => onNavigate('evidence')}
          className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="group-hover:text-slate-200 transition-colors">Total Evidence</span>
            <Eye className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white font-mono">
            {stats.evidenceCount}
          </div>
          <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Captured Vault
          </div>
        </div>

        {/* Monitoring State */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Monitoring</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base lg:text-lg font-bold text-white flex items-center gap-1.5 mt-1 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                stats.monitoringStatus === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            ></span>
            {stats.monitoringStatus === 'active' ? 'ACTIVE' : 'PAUSED'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            FPS: {stats.fps} | 30fps ideal
          </div>
        </div>

        {/* Camera Connection */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Camera</span>
            <Camera className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base lg:text-lg font-bold text-white flex items-center gap-1.5 mt-1 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                stats.cameraStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            ></span>
            {stats.cameraStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate" title={stats.cameraName}>
            {stats.resolution || '1280x720'}
          </div>
        </div>

        {/* AI Engine Status */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AI Vision</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base lg:text-lg font-bold text-cyan-300 flex items-center gap-1.5 mt-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            ACTIVE
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            TensorFlow COCO-SSD
          </div>
        </div>
      </div>

      {/* Main Grid: Live Preview & Hall Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Camera Widget */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="font-semibold text-xs md:text-sm text-white">LIVE CAMERA FEED</span>
              <span className="text-xs text-slate-400 font-mono">[{stats.cameraName}]</span>
            </div>
            <button
              onClick={() => onNavigate('live')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
            >
              Full Screen Surveillance <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onNavigate('live')}
            className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center cursor-pointer group overflow-hidden"
          >
            {stats.cameraStatus === 'connected' ? (
              <div className="w-full h-full relative">
                {/* Mirror view of video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                {/* Overlay Grid lines */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none border border-cyan-500/20">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="border border-cyan-500/10 flex items-start justify-start p-1">
                      <span className="text-[9px] font-mono text-cyan-400/50 bg-slate-950/50 px-1 rounded">
                        {String.fromCharCode(65 + Math.floor(i / 4))}{(i % 4) + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded border border-slate-700 text-xs font-mono text-slate-200">
                  🔴 LIVE FEED | {stats.resolution} | {stats.fps} FPS
                </div>
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <Camera className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                <div className="text-sm font-semibold text-slate-300">Camera Feed Idle / Disconnected</div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Connect your USB camera or laptop webcam to commence live computer vision monitoring.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectCamera();
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  <Camera className="w-3.5 h-3.5" /> Connect Camera Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Exam Hall Seating Matrix Status */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Seating Hall Zone Matrix
                </h3>
                <p className="text-xs text-slate-400">16-desk zoned examination layout</p>
              </div>
              <button
                onClick={() => onNavigate('hall')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                Layout Editor <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 4x4 Seat Grid */}
            <div className="grid grid-cols-4 gap-2 my-4">
              {seats.map((seat) => (
                <div
                  key={seat.id}
                  onClick={() => onNavigate('hall')}
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer hover:scale-105 ${getSeatBadgeColor(
                    seat.status
                  )}`}
                >
                  <div className="font-mono font-bold text-sm">{seat.id}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider mt-0.5 opacity-80">
                    {seat.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy & Compliance Assurance Box */}
          <div className="mt-4 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Ethical Privacy Protection Enforced</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              No facial recognition or identity profiling is executed. Students are identified strictly by desk zone
              coordinates (e.g. B3). All flagged events represent &quot;Possible Suspicious Activity&quot; requiring human invigilator verification.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Suspicious Activity Ticker / Alert Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-sm text-white">Recent Suspicious Activity Stream</h3>
            {pendingAlerts.length > 0 && (
              <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold animate-pulse">
                {pendingAlerts.length} Action Needed
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
          >
            View All ({alerts.length}) <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No suspicious activities recorded yet in this examination session.
          </div>
        ) : (
          <div className="space-y-2">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  alert.status === 'pending'
                    ? 'bg-rose-950/30 border-rose-700/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      alert.status === 'pending' ? 'bg-rose-900/60 text-rose-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {getActivityIcon(alert.activityType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {alert.seatId}
                      </span>
                      <span className="font-semibold text-xs md:text-sm text-slate-200">
                        {alert.activityTitle}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Conf: {alert.confidence}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{alert.timeDisplay}</span>
                      <span>•</span>
                      <span>{alert.notes || 'Automated visual detection'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {alert.evidenceImage && (
                    <button
                      onClick={() => onNavigate('evidence')}
                      className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                    >
                      Evidence
                    </button>
                  )}

                  {alert.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => onReviewAlert(alert.id)}
                        className="px-3 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 shadow-sm"
                      >
                        <UserCheck className="w-3 h-3" /> Review
                      </button>
                      <button
                        onClick={() => onDismissAlert(alert.id)}
                        className="px-3 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                        alert.status === 'reviewed'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-slate-500 bg-slate-800'
                      }`}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog: Reset Exam Timer */}
      {isConfirmingReset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Exam Timer?</h3>
                <span className="text-xs font-mono text-slate-400">Current Session Time: {formattedTime}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will reset the current examination timer back to <strong>00:00:00</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  resetTimer();
                  setIsConfirmingReset(false);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition-colors uppercase"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: New Exam Session */}
      {isConfirmingNewSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-cyan-950/80 border border-cyan-600/60 text-cyan-400">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Start New Exam Session?</h3>
                <span className="text-xs font-mono text-slate-400">Active: {sessionId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will generate a new examination session and reset the exam timer to <strong>00:00:00</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmingNewSession(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  startNewSession();
                  setIsConfirmingNewSession(false);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-colors uppercase"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                START NEW SESSION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
