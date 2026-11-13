import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { AlertItem, DetectedBoundingBox, SeatZone, SystemSettings, PaperClassificationType } from '../types';
import { soundService } from './soundService';
import { paperClassifier } from './paperClassificationService';

interface MovementHistoryItem {
  timestamp: number;
  direction: 'left' | 'right' | 'center';
  magnitude: number;
}

export class AiDetectionEngine {
  private model: cocoSsd.ObjectDetection | null = null;
  private isModelLoading: boolean = false;
  private isProcessing: boolean = false;

  // Track movement history per seat: seatId -> MovementHistoryItem[]
  private movementHistories: Map<string, MovementHistoryItem[]> = new Map();
  // Track previous bounding box per seat to calculate velocity & direction
  private previousBoundingBoxes: Map<string, [number, number, number, number]> = new Map();
  // Cooldown tracker: `${seatId}_${activityType}` -> timestamp
  private alertCooldowns: Map<string, number> = new Map();

  // Callbacks
  private onAlertCallback: ((alert: AlertItem) => void) | null = null;
  private onDetectionsCallback: ((detections: DetectedBoundingBox[]) => void) | null = null;

  public setOnAlert(cb: (alert: AlertItem) => void) {
    this.onAlertCallback = cb;
  }

  public setOnDetections(cb: (detections: DetectedBoundingBox[]) => void) {
    this.onDetectionsCallback = cb;
  }

  /**
   * Load COCO-SSD pretrained model
   */
  public async loadModel(): Promise<boolean> {
    if (this.model) return true;
    if (this.isModelLoading) return false;

    this.isModelLoading = true;
    try {
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // fast, real-time FPS on web
      });
      this.isModelLoading = false;
      return true;
    } catch (err) {
      console.warn('Failed to load local model, retrying standard mobilenet', err);
      try {
        this.model = await cocoSsd.load({ base: 'mobilenet_v1' });
        this.isModelLoading = false;
        return true;
      } catch (e2) {
        console.error('Model load error:', e2);
        this.isModelLoading = false;
        return false;
      }
    }
  }

  public isReady(): boolean {
    return !!this.model;
  }

  /**
   * Process a single video frame from camera
   */
  public async processFrame(
    videoElement: HTMLVideoElement,
    seats: SeatZone[],
    settings: SystemSettings,
    captureScreenshotFn?: () => string
  ): Promise<DetectedBoundingBox[]> {
    if (!this.model || this.isProcessing) {
      return [];
    }

    if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
      return [];
    }

    this.isProcessing = true;

    try {
      // 1. Run inference
      const predictions = await this.model.detect(videoElement, 20, 0.25);
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;

      const detectedBoxes: DetectedBoundingBox[] = [];
      const personDetections: Array<{
        bbox: [number, number, number, number];
        score: number;
        seat: SeatZone | null;
      }> = [];

      const suspiciousObjects: Array<{
        class: string;
        bbox: [number, number, number, number];
        score: number;
      }> = [];

      // 2. Classify predictions
      for (const pred of predictions) {
        const [x, y, w, h] = pred.bbox;
        const normalizedCx = (x + w / 2) / videoWidth;
        const normalizedCy = (y + h / 2) / videoHeight;

        if (pred.class === 'person' && pred.score >= settings.detectionConfidence) {
          const matchedSeat = this.findNearestSeat(normalizedCx, normalizedCy, seats);
          personDetections.push({
            bbox: [x, y, w, h],
            score: pred.score,
            seat: matchedSeat,
          });
        } else if (
          (pred.class === 'cell phone' ||
            pred.class === 'book' ||
            pred.class === 'laptop' ||
            pred.class === 'remote') &&
          pred.score >= 0.4
        ) {
          suspiciousObjects.push({
            class: pred.class,
            bbox: [x, y, w, h],
            score: pred.score,
          });
        }
      }

      const now = Date.now();

      // 3. Process each detected person
      personDetections.forEach((p, idx) => {
        const seatId = p.seat ? p.seat.id : `Z${idx + 1}`;
        let isSuspicious = false;
        let suspicionReason = '';

        // Movement & Head Turn analysis
        const turnCount = this.analyzeMovementAndTurns(
          seatId,
          p.bbox,
          now,
          settings.movementSensitivity,
          settings.turnWindowSeconds
        );

        if (turnCount >= settings.turnCountThreshold) {
          isSuspicious = true;
          suspicionReason = `Repeated Lateral Head Turning (${turnCount} turns in ${settings.turnWindowSeconds}s)`;

          this.triggerAlert(
            {
              seatId,
              activityType: 'movement',
              activityTitle: 'Repeated Head Turning / Looking at Neighbor',
              confidence: Math.round(p.score * 100),
              severity: 'medium',
              notes: `Candidate at seat ${seatId} turned head ${turnCount} times within ${settings.turnWindowSeconds}s. Invigilator verification advised.`,
            },
            settings,
            captureScreenshotFn
          );
        }

        detectedBoxes.push({
          id: `person-${idx}`,
          class: 'person',
          score: p.score,
          bbox: p.bbox,
          seatId,
          isSuspicious,
          suspicionReason,
          headTurnCount: turnCount,
        });
      });

      // 4. Correlate objects (devices and papers/cheat-sheets) with student desk zones
      const deskPapersMap = new Map<string, Array<{ type: PaperClassificationType }>>();

      suspiciousObjects.forEach((obj, objIdx) => {
        const [ox, oy, ow, oh] = obj.bbox;
        const ocx = ox + ow / 2;
        const ocy = oy + oh / 2;

        // Find nearest person to this object
        let closestPerson: {
          bbox: [number, number, number, number];
          score: number;
          seat: SeatZone | null;
        } | null = null;
        let minDistance = Infinity;

        for (const p of personDetections) {
          const [px, py, pw, ph] = p.bbox;
          // check if object is inside or near the person's desk/body area
          const pcx = px + pw / 2;
          const pcy = py + ph / 2;
          const dist = Math.hypot(ocx - pcx, ocy - pcy);

          // Max distance threshold in pixels
          const maxDist = Math.max(pw, ph) * 1.5;
          if (dist < maxDist && dist < minDistance) {
            minDistance = dist;
            closestPerson = p;
          }
        }

        const seatId = closestPerson?.seat?.id || this.findNearestSeat(ocx / videoWidth, ocy / videoHeight, seats)?.id || 'B3';
        const isDevice = obj.class === 'cell phone' || obj.class === 'laptop' || obj.class === 'remote';
        const isPaperObject = obj.class === 'book';

        let isSuspicious = false;
        let suspicionReason = '';
        let paperClassification: PaperClassificationType | undefined = undefined;
        let paperClassificationLabel: string | undefined = undefined;
        let isOfficial = false;

        if (isPaperObject) {
          // Estimate desk pixel area
          const deskW = closestPerson ? closestPerson.bbox[2] : ow * 2.5;
          const deskH = closestPerson ? closestPerson.bbox[3] : oh * 2.5;
          const deskPixelArea = deskW * deskH * 0.6;

          const existingOnDesk = deskPapersMap.get(seatId) || [];
          const paperResult = paperClassifier.classifyPaper(obj.bbox, deskPixelArea, existingOnDesk);

          existingOnDesk.push({ type: paperResult.classification });
          deskPapersMap.set(seatId, existingOnDesk);

          paperClassification = paperResult.classification;
          paperClassificationLabel = paperResult.label;
          isOfficial = paperResult.isOfficial;

          if (paperResult.shouldAlert) {
            isSuspicious = true;
            suspicionReason = paperResult.label;

            // Trigger unauthorized paper/cheat-sheet alert
            this.triggerAlert(
              {
                seatId,
                activityType: 'cheat_sheet',
                activityTitle: 'Possible Cheat Sheet / Unauthorized Paper',
                confidence: paperResult.confidence,
                severity: 'high',
                notes: `${paperResult.reason} Verification required.`,
              },
              settings,
              captureScreenshotFn
            );
          }
        } else if (isDevice) {
          isSuspicious = true;
          suspicionReason = `Unauthorized Device: ${obj.class.toUpperCase()}`;

          this.triggerAlert(
            {
              seatId,
              activityType: 'phone',
              activityTitle: 'Possible Unauthorized Device',
              confidence: Math.round(obj.score * 100),
              severity: 'high',
              notes: `Visual AI detected ${obj.class} at seat zone ${seatId} with ${(obj.score * 100).toFixed(0)}% confidence.`,
            },
            settings,
            captureScreenshotFn
          );
        }

        // Mark nearest person box as suspicious if a violation occurred
        if (isSuspicious) {
          const targetBox = detectedBoxes.find((b) => b.seatId === seatId);
          if (targetBox) {
            targetBox.isSuspicious = true;
            targetBox.suspicionReason = suspicionReason;
          }
        }

        detectedBoxes.push({
          id: `obj-${objIdx}`,
          class: obj.class,
          score: obj.score,
          bbox: obj.bbox,
          seatId,
          isSuspicious,
          suspicionReason,
          paperClassification,
          paperClassificationLabel,
          isOfficial,
        });
      });

      // 5. Check student interaction / proximity
      if (personDetections.length >= 2) {
        for (let i = 0; i < personDetections.length; i++) {
          for (let j = i + 1; j < personDetections.length; j++) {
            const p1 = personDetections[i];
            const p2 = personDetections[j];
            const [x1, y1, w1, h1] = p1.bbox;
            const [x2, y2, w2, h2] = p2.bbox;

            const c1x = x1 + w1 / 2;
            const c1y = y1 + h1 / 2;
            const c2x = x2 + w2 / 2;
            const c2y = y2 + h2 / 2;

            const dist = Math.hypot(c1x - c2x, c1y - c2y);
            const closeThreshold = (w1 + w2) * 0.45;

            if (dist < closeThreshold) {
              const seatA = p1.seat?.id || 'A';
              const seatB = p2.seat?.id || 'B';
              this.triggerAlert(
                {
                  seatId: `${seatA}-${seatB}`,
                  activityType: 'interaction',
                  activityTitle: 'Possible Student Interaction / Collusion',
                  confidence: 81,
                  severity: 'medium',
                  notes: `Proximity violation detected between zones ${seatA} and ${seatB}. Candidate leaning or passing notes.`,
                },
                settings,
                captureScreenshotFn
              );
            }
          }
        }
      }

      if (this.onDetectionsCallback) {
        this.onDetectionsCallback(detectedBoxes);
      }

      return detectedBoxes;
    } catch (err) {
      console.error('Frame detection error:', err);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Movement and repetitive head-turn analysis
   */
  private analyzeMovementAndTurns(
    seatId: string,
    currentBbox: [number, number, number, number],
    now: number,
    sensitivity: number,
    windowSeconds: number
  ): number {
    const prevBbox = this.previousBoundingBoxes.get(seatId);
    this.previousBoundingBoxes.set(seatId, currentBbox);

    let history = this.movementHistories.get(seatId) || [];

    // Prune events outside time window
    const cutoff = now - windowSeconds * 1000;
    history = history.filter((h) => h.timestamp >= cutoff);

    if (prevBbox) {
      const [px, , pw] = prevBbox;
      const [cx, , cw] = currentBbox;

      // Track upper 35% bounding box centroid horizontal shift
      const prevCenterX = px + pw / 2;
      const currCenterX = cx + cw / 2;
      const deltaX = currCenterX - prevCenterX;

      // Normalize by width
      const normalizedShift = deltaX / cw;
      // Sensitivity factor: higher sensitivity => smaller shift required
      const threshold = 0.08 / (sensitivity / 5);

      if (Math.abs(normalizedShift) > threshold) {
        const direction = normalizedShift > 0 ? 'right' : 'left';
        const lastTurn = history[history.length - 1];

        // Avoid counting micro oscillations within 500ms
        if (!lastTurn || now - lastTurn.timestamp > 600 || lastTurn.direction !== direction) {
          history.push({
            timestamp: now,
            direction,
            magnitude: Math.abs(normalizedShift),
          });
        }
      }
    }

    this.movementHistories.set(seatId, history);
    return history.length;
  }

  /**
   * Match coordinate to the closest configured seat zone
   */
  private findNearestSeat(normX: number, normY: number, seats: SeatZone[]): SeatZone | null {
    if (!seats.length) return null;

    // Check if inside any seat box
    for (const seat of seats) {
      if (
        normX >= seat.x &&
        normX <= seat.x + seat.width &&
        normY >= seat.y &&
        normY <= seat.y + seat.height
      ) {
        return seat;
      }
    }

    // Otherwise find closest center
    let closest: SeatZone = seats[0];
    let minDist = Infinity;

    for (const seat of seats) {
      const seatCenterX = seat.x + seat.width / 2;
      const seatCenterY = seat.y + seat.height / 2;
      const dist = Math.hypot(normX - seatCenterX, normY - seatCenterY);
      if (dist < minDist) {
        minDist = dist;
        closest = seat;
      }
    }

    return closest;
  }

  /**
   * Trigger an alert with cooldown and sound/evidence
   */
  private triggerAlert(
    alertData: Omit<AlertItem, 'id' | 'timestamp' | 'timeDisplay' | 'status'>,
    settings: SystemSettings,
    captureScreenshotFn?: () => string
  ) {
    const cooldownKey = `${alertData.seatId}_${alertData.activityType}`;
    const now = Date.now();
    const lastTriggered = this.alertCooldowns.get(cooldownKey) || 0;

    const cooldownMs = 14000;

    if (now - lastTriggered < cooldownMs) {
      return;
    }

    this.alertCooldowns.set(cooldownKey, now);

    let evidenceImage: string | undefined = undefined;
    if (settings.autoCaptureEvidence && captureScreenshotFn) {
      try {
        evidenceImage = captureScreenshotFn();
      } catch {
        // ignore
      }
    }

    const alertId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAlert: AlertItem = {
      ...alertData,
      id: alertId,
      timestamp: new Date().toISOString(),
      timeDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'pending',
      evidenceImage,
    };

    // Play warning sound
    if (settings.soundAlertsEnabled) {
      soundService.playAlertSiren(alertData.severity);
    }

    if (this.onAlertCallback) {
      this.onAlertCallback(newAlert);
    }
  }

  /**
   * Reset tracking state
   */
  public reset() {
    this.movementHistories.clear();
    this.previousBoundingBoxes.clear();
    this.alertCooldowns.clear();
  }
}

export const aiEngine = new AiDetectionEngine();
