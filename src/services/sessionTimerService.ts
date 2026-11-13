export interface ExamSessionState {
  sessionId: string;
  sessionName: string;
  accumulatedMs: number;
  startTime: number | null;
  isRunning: boolean;
  lastSavedAt: number;
}

const STORAGE_KEY = 'exam_watch_session_timer_v2';

export function formatExamDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function generateSessionId(): string {
  const currentYear = new Date().getFullYear();
  const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `#EXAM-${currentYear}-${randomChar}${randomNum}`;
}

const defaultSessionState: ExamSessionState = {
  sessionId: '#EXAM-2026-A',
  sessionName: 'Midterm General Examination',
  accumulatedMs: 0,
  startTime: null,
  isRunning: false,
  lastSavedAt: Date.now(),
};

class SessionTimerService {
  private state: ExamSessionState = defaultSessionState;
  private listeners: Set<(state: ExamSessionState, formatted: string) => void> = new Set();
  private tickerInterval: any = null;

  constructor() {
    this.loadState();
    this.startTicker();
  }

  public getState(): ExamSessionState {
    return { ...this.state };
  }

  public getElapsedMs(): number {
    if (this.state.isRunning && this.state.startTime) {
      const now = Date.now();
      const currentSegment = Math.max(0, now - this.state.startTime);
      return this.state.accumulatedMs + currentSegment;
    }
    return this.state.accumulatedMs;
  }

  public getFormattedTime(): string {
    return formatExamDuration(this.getElapsedMs());
  }

  public subscribe(cb: (state: ExamSessionState, formatted: string) => void): () => void {
    this.listeners.add(cb);
    cb(this.state, this.getFormattedTime());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const formatted = this.getFormattedTime();
    this.listeners.forEach((cb) => {
      try {
        cb({ ...this.state }, formatted);
      } catch {
        // ignore listener errors
      }
    });
  }

  private saveState() {
    this.state.lastSavedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage disabled or full
    }
  }

  private loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ExamSessionState = JSON.parse(raw);
        // Verify structure
        if (typeof parsed.accumulatedMs === 'number' && typeof parsed.sessionId === 'string') {
          this.state = parsed;
          return;
        }
      }
    } catch {
      // fallback to default
    }
    this.state = { ...defaultSessionState };
  }

  private startTicker() {
    if (this.tickerInterval) return;
    this.tickerInterval = setInterval(() => {
      // If timer is running, notify subscribers every 250ms to ensure second tick matches exactly
      if (this.state.isRunning) {
        this.notify();
      }
    }, 250);
  }

  /**
   * Start / Resume monitoring timer
   */
  public start(): string {
    if (!this.state.isRunning) {
      this.state.isRunning = true;
      this.state.startTime = Date.now();
      this.saveState();
      this.notify();
    }
    return this.getFormattedTime();
  }

  /**
   * Pause monitoring timer
   */
  public pause(): string {
    if (this.state.isRunning && this.state.startTime) {
      const segment = Math.max(0, Date.now() - this.state.startTime);
      this.state.accumulatedMs += segment;
      this.state.startTime = null;
      this.state.isRunning = false;
      this.saveState();
      this.notify();
    }
    return this.getFormattedTime();
  }

  /**
   * Reset exam timer back to 00:00:00
   */
  public reset(): string {
    this.state.accumulatedMs = 0;
    if (this.state.isRunning) {
      this.state.startTime = Date.now();
    } else {
      this.state.startTime = null;
    }
    this.saveState();
    this.notify();
    return this.getFormattedTime();
  }

  /**
   * Start a brand new exam session
   */
  public newSession(customSessionId?: string, customName?: string): ExamSessionState {
    this.state.sessionId = customSessionId || generateSessionId();
    if (customName) {
      this.state.sessionName = customName;
    }
    this.state.accumulatedMs = 0;
    if (this.state.isRunning) {
      this.state.startTime = Date.now();
    } else {
      this.state.startTime = null;
    }
    this.saveState();
    this.notify();
    return { ...this.state };
  }

  /**
   * Sync with monitoring status from UI
   */
  public syncMonitoringStatus(status: 'active' | 'paused' | 'stopped') {
    if (status === 'active') {
      if (!this.state.isRunning) {
        this.start();
      }
    } else {
      if (this.state.isRunning) {
        this.pause();
      }
    }
  }
}

export const sessionTimer = new SessionTimerService();
