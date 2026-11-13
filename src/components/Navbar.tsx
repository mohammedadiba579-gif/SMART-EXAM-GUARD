import React, { useState } from 'react';
import {
  ShieldAlert,
  Camera,
  Activity,
  Bell,
  Eye,
  Grid3X3,
  Sliders,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Timer,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';
import { HallStats } from '../types';
import { soundService } from '../services/soundService';
import { useExamSessionTimer } from '../hooks/useExamSessionTimer';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  stats: HallStats;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onQuickTestAlert: () => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  stats,
  soundEnabled,
  setSoundEnabled,
  onQuickTestAlert,
  isDemoMode,
  setIsDemoMode,
}) => {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingNewSession, setIsConfirmingNewSession] = useState(false);

  const { formattedTime, isRunning, sessionId, resetTimer, startNewSession } = useExamSessionTimer();

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.setMuted(!next);
    if (next) {
      soundService.playAlertSiren('low');
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 60) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> HIGH RISK ({score}%)
        </span>
      );
    }
    if (score >= 25) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <Radio className="w-3 h-3 text-amber-400" /> ELEVATED ({score}%)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> NORMAL ({score}%)
      </span>
    );
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      {/* Top telemetry status bar */}
      <div className="px-4 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="font-semibold tracking-wider text-slate-200">EXAM HALL SYSTEM</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono font-bold">SESSION: {sessionId}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Camera:</span>
            {stats.cameraStatus === 'connected' ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> CONNECTED
              </span>
            ) : stats.cameraStatus === 'connecting' ? (
              <span className="text-amber-400 font-medium">CONNECTING...</span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> DISCONNECTED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Monitoring:</span>
            {stats.monitoringStatus === 'active' ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ACTIVE
              </span>
            ) : (
              <span className="text-slate-400 font-medium">PAUSED</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">AI Vision:</span>
            <span className="text-cyan-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> COCO-SSD / POSE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Evidence:</span>
            <span className="text-slate-200 font-mono font-semibold">
              {stats.evidenceCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">{getRiskBadge(stats.riskScore)}</div>

          {/* Demo mode badge / toggle */}
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
              isDemoMode
                ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Demo Mode with simulated candidate feeds"
          >
            {isDemoMode ? '● DEMO MODE ACTIVE' : '○ REAL CAMERA MODE'}
          </button>

          {/* Quick test alert button */}
          <button
            onClick={onQuickTestAlert}
            className="px-2 py-0.5 rounded text-xs bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 flex items-center gap-1 transition-all"
            title="Inject test suspicious event to verify alert & audio siren"
          >
            <ShieldAlert className="w-3 h-3 text-rose-400" /> Test Alert
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-400" />
            )}
          </button>

          {/* Separate Exam Session Timer */}
          <div
            className={`flex items-center gap-1.5 font-mono px-2.5 py-0.5 rounded border transition-all ${
              isRunning
                ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300 shadow-sm shadow-emerald-950/50'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
            title="Exam Session Timer (HH:MM:SS) - Active during examination monitoring"
          >
            <Timer className={`w-3.5 h-3.5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-[11px] font-sans text-slate-400 font-medium">Exam Time:</span>
            <span className="font-bold tracking-wider">{formattedTime}</span>
            {!isRunning && stats.monitoringStatus === 'paused' && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans font-semibold">
                PAUSED
              </span>
            )}
          </div>

          {/* Reset Exam Timer Button */}
          <button
            onClick={() => setIsConfirmingReset(true)}
            className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-all"
            title="Reset examination timer to 00:00:00"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Reset Timer</span>
          </button>

          {/* New Exam Session Button */}
          <button
            onClick={() => setIsConfirmingNewSession(true)}
            className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-all"
            title="Start a new exam session and reset timer to 00:00:00"
          >
            <PlusCircle className="w-3 h-3 text-emerald-400" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-rose-600 to-indigo-700 shadow-md shadow-rose-950/50 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
              EXAM<span className="text-rose-500">WATCH</span> AI
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                PROCTOR PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-Time Examination Hall Surveillance & Suspicious Activity Detection
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'dashboard'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentTab('live')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all relative ${
              currentTab === 'live'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Monitoring</span>
            {stats.cameraStatus === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5"></span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('alerts')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all relative ${
              currentTab === 'alerts'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ml-0.5 ${
                stats.activeAlerts > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {stats.activeAlerts}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('evidence')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'evidence'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Evidence</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 ml-0.5 border border-slate-700">
              {stats.evidenceCount}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('hall')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'hall'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Exam Hall</span>
          </button>

          <button
            onClick={() => setCurrentTab('materials')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'materials'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Exam Materials</span>
          </button>

          <button
            onClick={() => setCurrentTab('camera-setup')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'camera-setup'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Setup</span>
          </button>

          <button
            onClick={() => setCurrentTab('settings')}
            className={`px-2.5 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 transition-all ${
              currentTab === 'settings'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
            title="Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </nav>
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
    </header>
  );
};
