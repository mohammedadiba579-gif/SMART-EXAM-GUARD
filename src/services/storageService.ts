import { AlertItem, SeatZone, SystemSettings } from '../types';

const ALERTS_STORAGE_KEY = 'exam_monitoring_alerts_v2';
const SEATS_STORAGE_KEY = 'exam_monitoring_seats_v2';
const SETTINGS_STORAGE_KEY = 'exam_monitoring_settings_v2';

export const defaultSettings: SystemSettings = {
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
  },
};

export const generateDefaultSeats = (): SeatZone[] => {
  const rows = ['A', 'B', 'C', 'D'];
  const cols = [1, 2, 3, 4];
  const seats: SeatZone[] = [];

  const marginX = 0.05;
  const marginY = 0.1;
  const usableW = 0.9;
  const usableH = 0.8;

  const colWidth = usableW / cols.length;
  const rowHeight = usableH / rows.length;

  rows.forEach((row, rIdx) => {
    cols.forEach((col, cIdx) => {
      const id = `${row}${col}`;
      seats.push({
        id,
        label: `Seat ${id}`,
        row,
        col,
        x: marginX + cIdx * colWidth + 0.015,
        y: marginY + rIdx * rowHeight + 0.02,
        width: colWidth - 0.03,
        height: rowHeight - 0.04,
        status: 'normal',
        assignedStudentCode: `STU-${id}`,
      });
    });
  });

  return seats;
};

export const initialMockAlerts: AlertItem[] = [
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
    notes: 'Exam invigilator checked student B3. Screen glance confirmed; warning issued.',
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
    notes: 'Candidate turned 4 times towards desk C3 within 8 seconds.',
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
    notes: 'Invigilator walked by to hand extra answer sheet. False alarm dismissed.',
  }
];

const isHandRelatedAlert = (a: { activityType?: string; activityTitle?: string }): boolean => {
  const type = String(a?.activityType || '');
  const title = String(a?.activityTitle || '').toUpperCase();
  return (
    type === 'hand_movement' ||
    type === 'skin_notes' ||
    title.includes('HAND DETECTED') ||
    title.includes('HAND MOVEMENT DETECTED') ||
    title.includes('HANDWRITTEN NOTES ON SKIN') ||
    title.includes('NOTES ON SKIN') ||
    title.includes('NOTES WRITTEN ON HAND')
  );
};

export const loadStoredAlerts = (): AlertItem[] => {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw !== null) {
      const parsed: AlertItem[] = JSON.parse(raw);
      return parsed.filter((a) => !isHandRelatedAlert(a));
    }
  } catch {
    // fallback
  }
  return initialMockAlerts;
};

export const saveStoredAlerts = (alerts: AlertItem[]) => {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts.slice(0, 100)));
  } catch {
    // storage full or disabled
  }
};

export const clearAllStoredAlerts = () => {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([]));
  } catch {
    // storage error
  }
};

const EVIDENCE_STORAGE_KEY = 'exam_monitoring_evidence_v2';

const sampleEvidenceSvg = (label: string, seat: string, time: string) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="100%" height="100%" fill="%230f172a"/><rect x="20" y="20" width="600" height="320" rx="10" fill="%231e293b" stroke="%23334155" stroke-width="2"/><text x="40" y="60" fill="%23ef4444" font-family="monospace" font-size="16" font-weight="bold">EXAM HALL CAM - EVIDENCE VAULT</text><text x="40" y="90" fill="%2394a3b8" font-family="monospace" font-size="13">ZONE: ${seat} | TIME: ${time}</text><text x="40" y="120" fill="%2338bdf8" font-family="monospace" font-size="14">${label}</text><rect x="180" y="140" width="280" height="150" fill="%23090d16" stroke="%23ef4444" stroke-width="2" stroke-dasharray="6,4"/><text x="210" y="220" fill="%23f87171" font-family="monospace" font-size="12">DESK OCCUPANT DETECTED</text></svg>`;

export const initialMockEvidence: AlertItem[] = [
  {
    id: 'EVD-2001',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    timeDisplay: new Date(Date.now() - 1000 * 60 * 14).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    seatId: 'B3',
    activityType: 'phone',
    activityTitle: 'Unauthorized Device Glance',
    confidence: 89,
    status: 'reviewed',
    severity: 'high',
    evidenceImage: sampleEvidenceSvg('Candidate glance at concealed device', 'B3', '10:14 AM'),
    notes: 'Exam invigilator checked student B3. Device confiscated for review.',
  },
  {
    id: 'EVD-2002',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    timeDisplay: new Date(Date.now() - 1000 * 60 * 8).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    seatId: 'C2',
    activityType: 'movement',
    activityTitle: 'Lateral Head Turning Posture',
    confidence: 84,
    status: 'pending',
    severity: 'medium',
    evidenceImage: sampleEvidenceSvg('Continuous lateral posture tilt towards C3', 'C2', '10:20 AM'),
    notes: 'Candidate turned 4 times towards desk C3 within 8 seconds.',
  },
];

export const loadStoredEvidence = (): AlertItem[] => {
  try {
    const raw = localStorage.getItem(EVIDENCE_STORAGE_KEY);
    if (raw !== null) {
      const parsed: AlertItem[] = JSON.parse(raw);
      return parsed.filter((e) => !isHandRelatedAlert(e));
    }
  } catch {
    // fallback
  }
  return initialMockEvidence;
};

export const saveStoredEvidence = (evidence: AlertItem[]) => {
  try {
    localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(evidence.slice(0, 100)));
  } catch {
    // storage error
  }
};

export const loadStoredSeats = (): SeatZone[] => {
  try {
    const raw = localStorage.getItem(SEATS_STORAGE_KEY);
    if (raw) {
      const parsed: SeatZone[] = JSON.parse(raw);
      // Ensure stored seats don't carry stale alert status on startup
      return parsed.map((s) => ({ ...s, status: 'normal' }));
    }
  } catch {
    // fallback
  }
  return generateDefaultSeats();
};

export const saveStoredSeats = (seats: SeatZone[]) => {
  try {
    localStorage.setItem(SEATS_STORAGE_KEY, JSON.stringify(seats));
  } catch {
    // storage error
  }
};

export const loadStoredSettings = (): SystemSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return defaultSettings;
};

export const saveStoredSettings = (settings: SystemSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage error
  }
};
