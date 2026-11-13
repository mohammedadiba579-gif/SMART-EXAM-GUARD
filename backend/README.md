# Smart Examination Hall Monitoring System - Camera Pipeline & Architecture

## System Architecture

```text
USB Camera / Laptop Webcam
        ↓
Browser MediaDevices & OpenCV Pipeline
        ↓
Live Video Feed & Stream Ingestion (1080p / 720p / 480p)
        ↓
Computer Vision & AI Detection Engine (COCO-SSD / MobileNet / Movement Analysis)
        ↓
Student Zone Coordinate Mapping (A1 - D4)
        ↓
Suspicious Activity Analysis Engine (Phone, Proximity, Head Turns)
        ↓
Real-Time Alert Engine & Audio Siren Synthesizer
        ↓
Invigilator Dashboard (Live HUD, Evidence Capture Vault, Incident Audit Log)
```

## 1. Real Camera Connection

The system supports:
- **USB Webcams**: External USB cameras (Logitech, Anker, Razer, generic USB Video Class UVC devices).
- **Integrated Webcams**: Laptop built-in webcams (FaceTime HD, Realtek, Sunplus, etc.).
- **Camera Selection**: Invigilators can scan, list, and switch between connected cameras on the fly.
- **Auto Disconnection Guard**: If a USB cable is unplugged or camera access terminates, the system immediately sounds a warning chime and displays:
  ```text
  🔴 CAMERA DISCONNECTED
  Monitoring has been paused. Please reconnect the camera.
  ```

## 2. Computer Vision & Suspicious Activity Detection

- **Student Detection**: Real-time person detection with bounding boxes labeled by seat zone (e.g. `Person A1`, `Person B3`).
- **Privacy Assurance**: No facial recognition is performed, and no student personal names are stored. Only zone codes are tracked.
- **Unauthorized Devices**: Optical detection of mobile phones (`cell phone`), tablets, and electronic screens in candidate desk zones.
- **Suspicious Movement Tracking**: Tracks candidate head direction and centroid shifts over a sliding time window (default: 8s). Normal single turns do not alert; repeated turns (default: 3+ turns) trigger an alert.
- **Candidate Proximity**: Proximity violation detection when two candidates lean into each other or pass exam materials.

## 3. Real-Time Alert & Evidence Capture

- Visual highlight: Bounding box switches to pulsing red (`🔴 B3 SUSPICIOUS`).
- Audio: Dual-frequency Web Audio alert siren buzzer.
- Automatic Evidence: Timestamped snapshot with detection bounding box overlay saved into the Evidence Vault.
- Review & Dismissal: Invigilator can review captured evidence, add observations, or dismiss false positives.

## 4. Running the Optional Python OpenCV Service

If you wish to run the camera feed through a standalone local Python process on your desktop:

```bash
pip install opencv-python numpy fastapi uvicorn
python backend/camera_service.py
```
