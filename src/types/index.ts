export type ActivityType =
  | 'phone'
  | 'movement'
  | 'interaction'
  | 'book'
  | 'absence'
  | 'multi_person'
  | 'suspicious_posture'
  | 'cheat_sheet'
  | 'unauthorized_paper';

export type PaperClassificationType =
  | 'official_question_paper'
  | 'official_answer_sheet'
  | 'unauthorized_cheat_sheet'
  | 'unverified_paper_object'
  | 'allowed_auxiliary';

export interface ExamMaterialConfig {
  questionPaper: {
    name: string;
    format: 'A4' | 'A3_Folded' | 'Booklet';
    color: string;
    aspectRatioMin: number;
    aspectRatioMax: number;
    maxCountPerDesk: number;
    hasDistinctiveHeader: boolean;
    sampleImage?: string;
  };
  answerSheet: {
    name: string;
    format: 'A4_Booklet' | 'OMR_Sheet' | 'Ruled_Pad';
    color: string;
    aspectRatioMin: number;
    aspectRatioMax: number;
    maxCountPerDesk: number;
    hasHeaderBand: boolean;
    sampleImage?: string;
  };
  allowAdmitCard: boolean;
  allowFormulaSheet: boolean;
  paperDetectionSensitivity: number; // 1-10
  smallSlipThreshold: number; // relative size below which paper is deemed micro-chit/slip
}

export type AlertStatus = 'pending' | 'reviewed' | 'dismissed';

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  groupId: string;
  isUsb?: boolean;
  isIntegrated?: boolean;
}

export interface DetectedBoundingBox {
  id: string;
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  seatId?: string;
  isSuspicious?: boolean;
  suspicionReason?: string;
  headTurnCount?: number;
  paperClassification?: PaperClassificationType;
  paperClassificationLabel?: string;
  isOfficial?: boolean;
}

export interface SeatZone {
  id: string; // e.g. "A1", "B3"
  label: string;
  row: string;
  col: number;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  width: number; // normalized 0-1
  height: number; // normalized 0-1
  status: 'normal' | 'suspicious' | 'alert' | 'vacant';
  lastActivity?: string;
  lastUpdated?: number;
  assignedStudentCode?: string;
}

export interface AlertItem {
  id: string;
  timestamp: string;
  timeDisplay: string;
  seatId: string;
  activityType: ActivityType;
  activityTitle: string;
  confidence: number;
  status: AlertStatus;
  evidenceImage?: string; // base64 or url
  notes?: string;
  resolvedAt?: string;
  severity: 'high' | 'medium' | 'low';
}

export type CameraSourceType = 'network' | 'integrated' | 'usb' | 'demo';

export interface NetworkCameraConfig {
  streamUrl: string;
  username?: string;
  password?: string;
  transport?: 'auto' | 'tcp' | 'udp';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastTestedAt?: string;
  resolution?: string;
  fps?: number;
  errorMessage?: string;
}

export interface SystemSettings {
  detectionConfidence: number; // e.g. 0.55
  movementSensitivity: number; // 1-10
  turnCountThreshold: number; // e.g. 3 turns
  turnWindowSeconds: number; // e.g. 8 seconds
  soundAlertsEnabled: boolean;
  soundVolume: number; // 0-1
  autoCaptureEvidence: boolean;
  demoMode: boolean;
  selectedResolution: '1920x1080' | '1280x720' | '640x480';
  highlightColor: string;
  showZoneOverlay: boolean;
  cameraSource?: CameraSourceType;
  networkCamera?: NetworkCameraConfig;
}

export interface HallStats {
  studentsDetected: number;
  activeAlerts: number;
  reviewedAlerts: number;
  dismissedAlerts: number;
  evidenceCount: number;
  cameraStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  monitoringStatus: 'active' | 'paused' | 'stopped';
  aiStatus: 'active' | 'loading' | 'idle' | 'error';
  fps: number;
  resolution: string;
  cameraName: string;
  riskScore: number; // 0-100
  cameraSource?: CameraSourceType;
}
