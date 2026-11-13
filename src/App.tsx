import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { CameraSetupView } from './components/CameraSetupView';
import { AlertsView } from './components/AlertsView';
import { EvidenceView } from './components/EvidenceView';
import { ExamHallView } from './components/ExamHallView';
import { SettingsView } from './components/SettingsView';
import { ExamMaterialsView } from './components/ExamMaterialsView';
import { cameraManager } from './services/cameraManager';
import { aiEngine } from './services/aiDetectionEngine';
import { soundService } from './services/soundService';
import { paperClassifier } from './services/paperClassificationService';
import { sessionTimer } from './services/sessionTimerService';
import {
  defaultSettings,
  generateDefaultSeats,
  loadStoredAlerts,
  loadStoredSeats,
  loadStoredSettings,
  saveStoredAlerts,
  saveStoredSeats,
  saveStoredSettings,
  clearAllStoredAlerts,
  loadStoredEvidence,
  saveStoredEvidence,
} from './services/storageService';
import {
  AlertItem,
  CameraDevice,
  DetectedBoundingBox,
  HallStats,
  SeatZone,
  SystemSettings,
  ExamMaterialConfig,
  NetworkCameraConfig,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('live');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SystemSettings>(loadStoredSettings());
  const [seats, setSeats] = useState<SeatZone[]>(loadStoredSeats());
  const [alerts, setAlerts] = useState<AlertItem[]>(loadStoredAlerts());
  const [evidenceList, setEvidenceList] = useState<AlertItem[]>(() => loadStoredEvidence());
  const [activeAlert, setActiveAlert] = useState<AlertItem | null>(null);
  const [selectedEvidenceAlert, setSelectedEvidenceAlert] = useState<AlertItem | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBoundingBox[]>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [materialConfig, setMaterialConfig] = useState<ExamMaterialConfig>(paperClassifier.getConfig());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'alert' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'alert' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [stats, setStats] = useState<HallStats>({
    studentsDetected: 0,
    activeAlerts: alerts.filter((a) => a.status === 'pending').length,
    reviewedAlerts: alerts.filter((a) => a.status === 'reviewed').length,
    dismissedAlerts: alerts.filter((a) => a.status === 'dismissed').length,
    evidenceCount: loadStoredEvidence().length,
    cameraStatus: 'disconnected',
    monitoringStatus: 'stopped',
    aiStatus: 'loading',
    fps: 0,
    resolution: '1280x720',
    cameraName: 'No Camera Connected',
    riskScore: 12,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Synchronize active camera stream to currently mounted video element across module changes
  useEffect(() => {
    const activeStream = cameraManager.getActiveStream();
    if (activeStream && stats.cameraStatus === 'connected') {
      if (masterVideoRef.current && masterVideoRef.current.srcObject !== activeStream) {
        masterVideoRef.current.srcObject = activeStream;
        masterVideoRef.current.play().catch(() => {});
      }
      if (videoRef.current && videoRef.current.srcObject !== activeStream) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentTab, stats.cameraStatus]);

  // Sync state to storage
  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredSeats(seats);
  }, [seats]);

  useEffect(() => {
    saveStoredEvidence(evidenceList);
  }, [evidenceList]);

  useEffect(() => {
    saveStoredAlerts(alerts);
    const pending = alerts.filter((a) => a.status === 'pending').length;
    const reviewed = alerts.filter((a) => a.status === 'reviewed').length;
    const dismissed = alerts.filter((a) => a.status === 'dismissed').length;
    const evCount = evidenceList.length;
    const calculatedRisk = Math.min(100, Math.max(5, pending * 28 + (stats.cameraStatus === 'disconnected' ? 40 : 0)));

    setStats((prev) => ({
      ...prev,
      activeAlerts: pending,
      reviewedAlerts: reviewed,
      dismissedAlerts: dismissed,
      evidenceCount: evCount,
      riskScore: calculatedRisk,
    }));
  }, [alerts, evidenceList, stats.cameraStatus]);

  // Synchronize exam session timer with monitoring status
  useEffect(() => {
    if (stats.monitoringStatus === 'active') {
      sessionTimer.start();
    } else if (stats.monitoringStatus === 'paused' || stats.monitoringStatus === 'stopped') {
      sessionTimer.pause();
    }
  }, [stats.monitoringStatus]);

  // Handle camera disconnection event immediately
  const handleCameraDisconnect = useCallback(() => {
    soundService.playCameraDisconnect();
    setStats((prev) => ({
      ...prev,
      cameraStatus: 'disconnected',
      monitoringStatus: 'stopped',
      fps: 0,
      studentsDetected: 0,
    }));
    setDetectedBoxes([]);
    // Immediately clear all active zone detection states so they show NOT MONITORED
    setSeats((prev) => prev.map((s) => ({ ...s, status: 'normal' })));
  }, []);

  // Initialize camera list and AI models on mount
  useEffect(() => {
    cameraManager.setOnDisconnect(handleCameraDisconnect);

    const init = async () => {
      // 1. Scan available cameras
      try {
        const cameras = await cameraManager.getAvailableCameras();
        setAvailableCameras(cameras);
        if (cameras.length > 0) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch (err) {
        console.warn('Camera enumeration error:', err);
      }

      // 2. Load AI vision model
      try {
        setStats((prev) => ({ ...prev, aiStatus: 'loading' }));
        const loaded = await aiEngine.loadModel();
        setStats((prev) => ({
          ...prev,
          aiStatus: loaded ? 'active' : 'idle',
        }));
      } catch (err) {
        console.error('AI load failure:', err);
        setStats((prev) => ({ ...prev, aiStatus: 'idle' }));
      }
    };

    init();

    return () => {
      cameraManager.destroy();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleCameraDisconnect]);

  // Connect external network camera (HDWifiCamPro / RTSP / HTTP)
  const handleConnectNetworkCamera = async (customConfig?: NetworkCameraConfig) => {
    const netConfig = customConfig || settings.networkCamera;
    if (!netConfig?.streamUrl) {
      showToast('⚠️ Please enter a stream URL for the external network camera.', 'alert');
      return;
    }

    setStats((prev) => ({ ...prev, cameraStatus: 'connecting' }));

    try {
      const { stream, cameraName, resolution } = await cameraManager.connectNetworkCamera(netConfig);

      if (masterVideoRef.current) {
        masterVideoRef.current.srcObject = stream;
        await masterVideoRef.current.play().catch(() => {});
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      soundService.playCameraConnect();

      setStats((prev) => ({
        ...prev,
        cameraStatus: 'connected',
        monitoringStatus: 'active',
        cameraName,
        resolution,
        cameraSource: 'network',
      }));

      setSettings((prev) => ({
        ...prev,
        cameraSource: 'network',
        networkCamera: {
          ...prev.networkCamera!,
          status: 'connected',
          resolution,
          fps: 25,
          lastTestedAt: new Date().toISOString(),
        },
      }));

      showToast(`🟢 Connected to ${cameraName} (${resolution})`, 'success');
    } catch (err: any) {
      console.error('Failed to connect network camera:', err);
      soundService.playCameraDisconnect();
      setStats((prev) => ({
        ...prev,
        cameraStatus: 'disconnected',
        monitoringStatus: 'stopped',
      }));
      setSettings((prev) => ({
        ...prev,
        networkCamera: prev.networkCamera
          ? {
              ...prev.networkCamera,
              status: 'error',
              errorMessage: err.message,
            }
          : undefined,
      }));
      showToast(`🔴 Network Camera Error: ${err.message}`, 'alert');
    }
  };

  // Connect camera method (routes according to selected cameraSource)
  const handleConnectCamera = async (deviceId?: string) => {
    if (settings.cameraSource === 'network') {
      await handleConnectNetworkCamera();
      return;
    }

    const targetId = deviceId || selectedCameraId || undefined;
    setStats((prev) => ({ ...prev, cameraStatus: 'connecting' }));

    try {
      const { stream, cameraName, resolution } = await cameraManager.connectCamera(
        targetId,
        settings.selectedResolution
      );

      if (masterVideoRef.current) {
        masterVideoRef.current.srcObject = stream;
        await masterVideoRef.current.play().catch(() => {});
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      soundService.playCameraConnect();

      setStats((prev) => ({
        ...prev,
        cameraStatus: 'connected',
        monitoringStatus: 'active',
        cameraName,
        resolution,
        cameraSource: settings.cameraSource || 'usb',
      }));

      // Refresh camera device list with labels revealed
      const updated = await cameraManager.getAvailableCameras();
      setAvailableCameras(updated);
    } catch (err) {
      console.error('Failed to connect camera:', err);
      setStats((prev) => ({ ...prev, cameraStatus: 'disconnected' }));
    }
  };

  // Disconnect camera (cleanly releases network or USB stream; NO fallback to laptop)
  const handleDisconnectCamera = () => {
    if (settings.cameraSource === 'network') {
      cameraManager.disconnectNetworkCamera().catch(() => {});
    } else {
      cameraManager.stopStream();
    }
    if (masterVideoRef.current) {
      masterVideoRef.current.srcObject = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    soundService.playCameraDisconnect();
    setStats((prev) => ({
      ...prev,
      cameraStatus: 'disconnected',
      monitoringStatus: 'stopped',
      fps: 0,
      studentsDetected: 0,
    }));
    setSettings((prev) => ({
      ...prev,
      networkCamera: prev.networkCamera
        ? { ...prev.networkCamera, status: 'disconnected' }
        : undefined,
    }));
    setDetectedBoxes([]);
    // Immediately clear all active zone detection states so they show NOT MONITORED
    setSeats((prev) => prev.map((s) => ({ ...s, status: 'normal' })));
  };

  // Toggle monitoring
  const handleToggleMonitoring = () => {
    if (stats.monitoringStatus === 'active') {
      setStats((prev) => ({ ...prev, monitoringStatus: 'paused' }));
      setDetectedBoxes([]);
      // When monitoring is paused, clear active zone detection states so zones show MONITORING PAUSED
      setSeats((prev) => prev.map((s) => ({ ...s, status: 'normal' })));
    } else {
      if (stats.cameraStatus === 'connected') {
        setStats((prev) => ({ ...prev, monitoringStatus: 'active' }));
      } else {
        showToast('⚠️ Please connect camera before starting monitoring.', 'alert');
      }
    }
  };

  // Refresh cameras
  const handleRefreshCameras = async () => {
    const cameras = await cameraManager.getAvailableCameras();
    setAvailableCameras(cameras);
    if (!selectedCameraId && cameras.length > 0) {
      setSelectedCameraId(cameras[0].deviceId);
    }
  };

  // Start monitoring shortcut from setup
  const handleStartMonitoring = () => {
    if (stats.cameraStatus === 'connected') {
      setStats((prev) => ({ ...prev, monitoringStatus: 'active' }));
      setCurrentTab('live');
    }
  };

  // Handle new incoming alert from AI engine
  const handleIncomingAlert = useCallback((newAlert: AlertItem) => {
    // Only accept and process incoming real-time alerts when camera is connected AND monitoring is active
    if (stats.cameraStatus !== 'connected' || stats.monitoringStatus !== 'active') {
      return;
    }

    setAlerts((prev) => {
      // Prevent duplicates
      if (prev.some((a) => a.id === newAlert.id)) return prev;
      return [newAlert, ...prev];
    });

    if (newAlert.evidenceImage) {
      setEvidenceList((prev) => {
        if (prev.some((e) => e.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
    }

    setActiveAlert(newAlert);

    // Update seat status
    setSeats((prevSeats) =>
      prevSeats.map((s) => {
        if (s.id === newAlert.seatId || newAlert.seatId.includes(s.id)) {
          return {
            ...s,
            status: newAlert.severity === 'high' ? 'alert' : 'suspicious',
            lastActivity: newAlert.activityTitle,
            lastUpdated: Date.now(),
          };
        }
        return s;
      })
    );
  }, [stats.cameraStatus, stats.monitoringStatus]);

  // Connect AI callback
  useEffect(() => {
    aiEngine.setOnAlert(handleIncomingAlert);
  }, [handleIncomingAlert]);

  // Manual snapshot capture
  const handleCaptureManualSnapshot = () => {
    if (!videoRef.current) return;
    const screenshot = cameraManager.captureSnapshot(videoRef.current, canvasRef.current || undefined);
    if (!screenshot) return;

    const manualAlert: AlertItem = {
      id: `SNP-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      timeDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      seatId: 'B3',
      activityType: 'suspicious_posture',
      activityTitle: 'Manual Invigilator Frame Inspection',
      confidence: 100,
      status: 'reviewed',
      severity: 'low',
      evidenceImage: screenshot,
      notes: 'Captured manually by invigilator during routine surveillance check.',
    };

    setAlerts((prev) => [manualAlert, ...prev]);
    setEvidenceList((prev) => [manualAlert, ...prev]);
    soundService.playAlertSiren('low');
  };

  // Trigger test suspicious event
  const handleTriggerTestEvent = () => {
    const testSeats = ['B3', 'C2', 'A2', 'D4'];
    const testSeat = testSeats[Math.floor(Math.random() * testSeats.length)];
    const types: Array<{ type: AlertItem['activityType']; title: string; conf: number; sev: AlertItem['severity'] }> = [
      { type: 'phone', title: 'Possible Unauthorized Device', conf: 89, sev: 'high' },
      { type: 'movement', title: 'Repeated Lateral Head Turning', conf: 84, sev: 'medium' },
      { type: 'interaction', title: 'Possible Candidate Proximity / Passing Notes', conf: 81, sev: 'medium' },
    ];
    const picked = types[Math.floor(Math.random() * types.length)];

    let evidenceScreenshot: string | undefined = undefined;
    if (videoRef.current && stats.cameraStatus === 'connected') {
      try {
        evidenceScreenshot = cameraManager.captureSnapshot(videoRef.current, canvasRef.current || undefined);
      } catch {
        // ignore
      }
    }

    const testAlert: AlertItem = {
      id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      timeDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      seatId: testSeat,
      activityType: picked.type,
      activityTitle: picked.title,
      confidence: picked.conf,
      status: 'pending',
      severity: picked.sev,
      evidenceImage: evidenceScreenshot,
      notes: `Test suspicious event calibration for desk ${testSeat}. Invigilator verification required.`,
    };

    handleIncomingAlert(testAlert);
    if (settings.soundAlertsEnabled) {
      soundService.playAlertSiren(picked.sev);
    }
  };

  // Simulate paper classification test cases
  const handleSimulatePaperTest = (type: 'qp' | 'answer_sheet' | 'cheat_sheet' | 'admit_card') => {
    if (type === 'qp') {
      showToast('📄 Official Question Paper verified: Standard A4 dimensions match. Classified as NORMAL (Zero alerts issued).', 'success');
      return;
    }
    if (type === 'answer_sheet') {
      showToast('📝 Official Answer Sheet verified: 32-page booklet format matches. Classified as NORMAL (Zero alerts issued).', 'success');
      return;
    }
    if (type === 'admit_card') {
      showToast('🏷️ Candidate Admit Card verified: Whitelisted auxiliary material on desk. Classified as NORMAL (Zero alerts issued).', 'info');
      return;
    }
    if (type === 'cheat_sheet') {
      let screenshot: string | undefined = undefined;
      if (videoRef.current && stats.cameraStatus === 'connected') {
        try {
          screenshot = cameraManager.captureSnapshot(videoRef.current, canvasRef.current || undefined);
        } catch {
          // ignore
        }
      }

      const cheatAlert: AlertItem = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        timeDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        seatId: 'B4',
        activityType: 'cheat_sheet',
        activityTitle: 'Possible Cheat Sheet / Unauthorized Paper',
        confidence: 89,
        status: 'pending',
        severity: 'high',
        evidenceImage: screenshot,
        notes: 'Concealed micro-slip / folded handwritten paper chit detected on desk. Verification required.',
      };

      handleIncomingAlert(cheatAlert);
      showToast('🚨 POSSIBLE UNAUTHORIZED MATERIAL: Seat B4 - Possible Cheat Sheet / Unauthorized Paper (89% Confidence)', 'alert');
      if (settings.soundAlertsEnabled) {
        soundService.playAlertSiren('high');
      }
    }
  };

  // Review alert action
  const handleReviewAlert = (id: string, notes?: string) => {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            status: 'reviewed',
            notes: notes || a.notes || 'Verified by proctor in examination room.',
            resolvedAt: new Date().toISOString(),
          };
        }
        return a;
      })
    );

    if (activeAlert?.id === id) {
      setActiveAlert(null);
    }

    // Reset seat status to normal
    const alertItem = alerts.find((a) => a.id === id);
    if (alertItem) {
      setSeats((prev) =>
        prev.map((s) => (s.id === alertItem.seatId ? { ...s, status: 'normal' } : s))
      );
    }
  };

  // Dismiss alert action
  const handleDismissAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'dismissed', resolvedAt: new Date().toISOString() } : a))
    );

    if (activeAlert?.id === id) {
      setActiveAlert(null);
    }

    const alertItem = alerts.find((a) => a.id === id);
    if (alertItem) {
      setSeats((prev) =>
        prev.map((s) => (s.id === alertItem.seatId ? { ...s, status: 'normal' } : s))
      );
    }
  };

  // View evidence modal trigger
  const handleViewEvidence = (alert: AlertItem) => {
    setSelectedEvidenceAlert(alert);
    setCurrentTab('evidence');
  };

  // Delete single evidence record
  const handleDeleteEvidence = (id: string) => {
    setEvidenceList((prev) => prev.filter((e) => e.id !== id));
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, evidenceImage: undefined } : a))
    );

    if (selectedEvidenceAlert?.id === id) {
      setSelectedEvidenceAlert(null);
    }

    // Sync deletion to server API
    fetch(`/api/evidence/${id}`, { method: 'DELETE' }).catch(() => {});
    showToast(`✓ Evidence record ${id} deleted successfully.`, 'success');
  };

  // Delete single alert record
  const handleDeleteAlert = (id: string) => {
    const alertToDelete = alerts.find((a) => a.id === id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    if (activeAlert?.id === id) {
      setActiveAlert(null);
    }

    // Reset seat status if no remaining active/pending alerts for that seat
    if (alertToDelete) {
      const remainingAlerts = alerts.filter(
        (a) => a.id !== id && a.seatId === alertToDelete.seatId && a.status === 'pending'
      );
      if (remainingAlerts.length === 0) {
        setSeats((prev) =>
          prev.map((s) => (s.id === alertToDelete.seatId ? { ...s, status: 'normal' } : s))
        );
      }
    }

    // Sync deletion to server API
    fetch(`/api/alerts/${id}`, { method: 'DELETE' }).catch(() => {});
    showToast(`✓ Alert ${id} deleted successfully.`, 'success');
  };

  // Delete all alerts completely (Evidence records remain intact)
  const handleDeleteAllAlerts = () => {
    setAlerts([]);
    clearAllStoredAlerts();
    setActiveAlert(null);

    // Reset all seat statuses to normal
    setSeats((prev) => prev.map((s) => ({ ...s, status: 'normal' })));

    // Sync deletion to server API
    fetch('/api/alerts', { method: 'DELETE' }).catch(() => {});
    showToast('All alerts have been deleted successfully.', 'success');
  };

  // Delete all evidence records
  const handleDeleteAllEvidence = () => {
    setEvidenceList([]);
    setAlerts((prev) => prev.map((a) => ({ ...a, evidenceImage: undefined })));
    setSelectedEvidenceAlert(null);

    // Sync deletion to server API
    fetch('/api/evidence', { method: 'DELETE' }).catch(() => {});
    showToast('✓ All evidence deleted successfully.', 'success');
  };

  // Update seat
  const handleUpdateSeat = (updated: SeatZone) => {
    setSeats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Reset seats
  const handleResetSeats = () => {
    setSeats(generateDefaultSeats());
  };

  // Continuous Camera Frame Processing & HUD Drawing Loop
  useEffect(() => {
    let isSubscribed = true;

    const renderLoop = async () => {
      if (!isSubscribed) return;

      const activeVideo = (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0)
        ? videoRef.current
        : (masterVideoRef.current && masterVideoRef.current.readyState >= 2 && masterVideoRef.current.videoWidth > 0)
        ? masterVideoRef.current
        : null;
      const canvas = canvasRef.current;

      const isCameraConnected = stats.cameraStatus === 'connected';
      const isMonitoringActive = stats.monitoringStatus === 'active';
      const hasLiveCameraFrames = Boolean(
        activeVideo && !activeVideo.paused && !activeVideo.ended
      );
      const canDetect = isCameraConnected && isMonitoringActive && hasLiveCameraFrames;

      if (canDetect && activeVideo && canvas) {
        // Sync canvas resolution
        if (canvas.width !== activeVideo.videoWidth || canvas.height !== activeVideo.videoHeight) {
          canvas.width = activeVideo.videoWidth || 1280;
          canvas.height = activeVideo.videoHeight || 720;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Real AI detection processing on camera frame
          const screenshotGetter = () => cameraManager.captureSnapshot(activeVideo);
          const boxes = await aiEngine.processFrame(activeVideo, seats, settings, screenshotGetter);

          if (isSubscribed) {
            setDetectedBoxes(boxes);

            const personCount = boxes.filter((b) => b.class === 'person').length;
            const currentFps = cameraManager.updateFps();

            setStats((prev) => ({
              ...prev,
              studentsDetected: personCount > 0 ? personCount : prev.studentsDetected,
              fps: currentFps,
            }));

            // Draw bounding boxes on canvas
            boxes.forEach((box) => {
              const [x, y, w, h] = box.bbox;
              const isAlert = box.isSuspicious;

              ctx.save();

              let strokeColor = isAlert ? '#ef4444' : '#06b6d4'; // default red or cyan
              let bgColor = isAlert ? 'rgba(185, 28, 28, 0.9)' : 'rgba(8, 51, 68, 0.85)';
              let tagText = isAlert
                ? `🔴 ${box.seatId || 'B3'} SUSPICIOUS${box.class === 'cell phone' ? ' - PHONE' : ''}`
                : `Person ${box.seatId || 'Student'} (${(box.score * 100).toFixed(0)}%)`;

              // Check if classified paper
              if (box.paperClassification === 'official_question_paper') {
                strokeColor = '#10b981'; // emerald green
                bgColor = 'rgba(6, 78, 59, 0.92)';
                tagText = `📄 QP [Official - No Alert]`;
              } else if (box.paperClassification === 'official_answer_sheet') {
                strokeColor = '#10b981'; // emerald green
                bgColor = 'rgba(6, 78, 59, 0.92)';
                tagText = `📝 Answer Sheet [Official - No Alert]`;
              } else if (box.paperClassification === 'allowed_auxiliary') {
                strokeColor = '#06b6d4'; // teal
                bgColor = 'rgba(14, 116, 144, 0.92)';
                tagText = `🏷️ Hall Ticket [Allowed]`;
              } else if (box.paperClassification === 'unauthorized_cheat_sheet') {
                strokeColor = '#f43f5e'; // vivid rose
                bgColor = 'rgba(190, 18, 60, 0.95)';
                tagText = `🚨 ${box.seatId || 'B4'} CHEAT SHEET / UNAPPROVED PAPER`;
              } else if (box.paperClassification === 'unverified_paper_object') {
                strokeColor = '#f59e0b'; // amber
                bgColor = 'rgba(180, 83, 9, 0.92)';
                tagText = `📄 Paper Object (Review)`;
              }

              ctx.lineWidth = isAlert ? 3 : 2;
              ctx.strokeStyle = strokeColor;

              // Rounded bounding box
              ctx.strokeRect(x, y, w, h);

              // Corner accents for high-tech HUD look
              const cornerLen = Math.min(w, h) * 0.15;
              ctx.lineWidth = 4;
              // Top-left
              ctx.beginPath();
              ctx.moveTo(x, y + cornerLen);
              ctx.lineTo(x, y);
              ctx.lineTo(x + cornerLen, y);
              ctx.stroke();

              // Top-right
              ctx.beginPath();
              ctx.moveTo(x + w - cornerLen, y);
              ctx.lineTo(x + w, y);
              ctx.lineTo(x + w, y + cornerLen);
              ctx.stroke();

              // Label background header
              ctx.font = 'bold 12px "JetBrains Mono", monospace';
              const textMetrics = ctx.measureText(tagText);
              const tagW = textMetrics.width + 16;
              const tagH = 24;

              ctx.fillStyle = bgColor;
              ctx.fillRect(x, Math.max(0, y - tagH), tagW, tagH);

              // Label text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(tagText, x + 8, Math.max(16, y - 7));

              // If head turning count exists, draw turn indicator
              if (box.headTurnCount && box.headTurnCount > 1) {
                const turnTag = `Turns: ${box.headTurnCount}/${settings.turnCountThreshold}`;
                ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
                ctx.fillRect(x, y + h, 110, 20);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px "JetBrains Mono", monospace';
                ctx.fillText(turnTag, x + 6, y + h + 14);
              }

              ctx.restore();
            });
          }
        }
      }

      // Demo mode simulation if enabled
      if (isDemoMode && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== 1280 || canvas.height !== 720) {
            canvas.width = 1280;
            canvas.height = 720;
          }
          // Draw simulated candidates in desks showing official materials vs cheat sheets
          const demoBoxes: DetectedBoundingBox[] = [
            { id: 'demo-1', class: 'person', score: 0.94, bbox: [120, 160, 200, 360], seatId: 'A1', isSuspicious: false },
            { id: 'demo-2', class: 'person', score: 0.91, bbox: [420, 150, 210, 370], seatId: 'A2', isSuspicious: false },
            // Candidate A2 official question paper (normal)
            { id: 'demo-qp-a2', class: 'book', score: 0.96, bbox: [440, 380, 85, 120], seatId: 'A2', isSuspicious: false, isOfficial: true, paperClassification: 'official_question_paper', paperClassificationLabel: 'Official Question Paper' },
            // Candidate B4 with Official QP + Official Answer Booklet + Hidden Cheat Chit
            { id: 'demo-3', class: 'person', score: 0.88, bbox: [720, 160, 205, 365], seatId: 'B4', isSuspicious: true, suspicionReason: 'Possible Cheat Sheet / Unauthorized Paper' },
            { id: 'demo-qp-b4', class: 'book', score: 0.95, bbox: [730, 370, 85, 120], seatId: 'B4', isSuspicious: false, isOfficial: true, paperClassification: 'official_question_paper', paperClassificationLabel: 'Official Question Paper' },
            { id: 'demo-ans-b4', class: 'book', score: 0.93, bbox: [825, 370, 90, 125], seatId: 'B4', isSuspicious: false, isOfficial: true, paperClassification: 'official_answer_sheet', paperClassificationLabel: 'Official Answer Sheet' },
            { id: 'demo-chit-b4', class: 'book', score: 0.89, bbox: [795, 440, 28, 24], seatId: 'B4', isSuspicious: true, isOfficial: false, paperClassification: 'unauthorized_cheat_sheet', paperClassificationLabel: 'Possible Cheat Sheet / Unauthorized Paper' },
            { id: 'demo-5', class: 'person', score: 0.93, bbox: [1000, 170, 200, 350], seatId: 'C2', isSuspicious: false },
          ];

          setDetectedBoxes(demoBoxes);
          setStats((prev) => ({ ...prev, studentsDetected: 16, fps: 30 }));
        }
      } else if (!isDemoMode && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      isSubscribed = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [stats.cameraStatus, stats.monitoringStatus, seats, settings, isDemoMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600/30 selection:text-rose-200">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        stats={stats}
        soundEnabled={settings.soundAlertsEnabled}
        setSoundEnabled={(enabled) => setSettings({ ...settings, soundAlertsEnabled: enabled })}
        onQuickTestAlert={handleTriggerTestEvent}
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            alerts={alerts}
            seats={seats}
            onNavigate={setCurrentTab}
            onReviewAlert={handleReviewAlert}
            onDismissAlert={handleDismissAlert}
            onToggleMonitoring={handleToggleMonitoring}
            onConnectCamera={() => handleConnectCamera()}
            videoRef={videoRef}
          />
        )}

        {currentTab === 'live' && (
          <LiveMonitoringView
            stats={stats}
            settings={settings}
            seats={seats}
            alerts={alerts}
            detectedBoxes={detectedBoxes}
            activeAlert={activeAlert}
            onConnectCamera={() => handleConnectCamera()}
            onDisconnectCamera={handleDisconnectCamera}
            onToggleMonitoring={handleToggleMonitoring}
            onRefreshCameras={handleRefreshCameras}
            onDismissAlert={handleDismissAlert}
            onReviewAlert={handleReviewAlert}
            onViewEvidence={handleViewEvidence}
            onTriggerTestEvent={handleTriggerTestEvent}
            onTestCheatSheet={() => handleSimulatePaperTest('cheat_sheet')}
            onCaptureManualSnapshot={handleCaptureManualSnapshot}
            videoRef={videoRef}
            canvasRef={canvasRef}
            containerRef={containerRef}
            isDemoMode={isDemoMode}
          />
        )}

        {currentTab === 'camera-setup' && (
          <CameraSetupView
            availableCameras={availableCameras}
            selectedCameraId={selectedCameraId}
            setSelectedCameraId={setSelectedCameraId}
            stats={stats}
            settings={settings}
            setSettings={setSettings}
            onConnectCamera={handleConnectCamera}
            onDisconnectCamera={handleDisconnectCamera}
            onRefreshCameras={handleRefreshCameras}
            onStartMonitoring={handleStartMonitoring}
            videoRef={videoRef}
            isDemoMode={isDemoMode}
            setIsDemoMode={setIsDemoMode}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onReviewAlert={handleReviewAlert}
            onDismissAlert={handleDismissAlert}
            onViewEvidence={handleViewEvidence}
            onDeleteAlert={handleDeleteAlert}
            onDeleteAllAlerts={handleDeleteAllAlerts}
          />
        )}

        {currentTab === 'evidence' && (
          <EvidenceView
            alerts={evidenceList}
            selectedEvidenceAlert={selectedEvidenceAlert}
            setSelectedEvidenceAlert={setSelectedEvidenceAlert}
            onDeleteEvidence={handleDeleteEvidence}
            onDeleteAllEvidence={handleDeleteAllEvidence}
          />
        )}

        {currentTab === 'hall' && (
          <ExamHallView
            seats={seats}
            onUpdateSeat={handleUpdateSeat}
            onResetSeats={handleResetSeats}
            alerts={alerts}
            onNavigateToAlertsForSeat={(seatId) => {
              setCurrentTab('alerts');
            }}
          />
        )}

        {currentTab === 'materials' && (
          <ExamMaterialsView
            materialConfig={materialConfig}
            onSaveConfig={(newCfg) => {
              setMaterialConfig(newCfg);
              showToast('Official exam materials reference configuration saved successfully.', 'success');
            }}
            onSimulatePaperTest={handleSimulatePaperTest}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            onResetDefaults={() => setSettings(defaultSettings)}
            isDemoMode={isDemoMode}
            setIsDemoMode={setIsDemoMode}
            cameraStatus={stats.cameraStatus}
            onDisconnectCamera={handleDisconnectCamera}
            onConnectNetworkCamera={() => handleConnectNetworkCamera()}
          />
        )}
      </main>

      {/* Persistent master video element keeps the active camera stream alive across all module switches */}
      <video
        ref={masterVideoRef}
        autoPlay
        playsInline
        muted
        className="hidden pointer-events-none"
      />

      {/* Floating System Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 max-w-md animate-bounce-short">
          <div
            className={`p-3.5 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md text-xs font-semibold ${
              toastMessage.type === 'alert'
                ? 'bg-rose-950/95 border-rose-500 text-rose-200 shadow-rose-950/80 animate-pulse'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200 shadow-emerald-950/80'
                : 'bg-slate-900/95 border-slate-700 text-slate-200 shadow-black'
            }`}
          >
            <div className="flex-1">{toastMessage.text}</div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white font-mono text-sm px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Persistent Footer */}
      <footer className="py-3 px-6 bg-slate-950 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">SMART EXAM PROCTOR SYSTEM</span>
          <span>•</span>
          <span>USB & Built-in Camera Pipeline Active</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Privacy Standard: Facial Recognition Inactive • ID by Seat Zone Only
        </div>
      </footer>
    </div>
  );
}
