#!/usr/bin/env python3
"""
Smart Examination Hall Monitoring System - FastAPI Camera Service
==================================================================
File: backend/app/main.py

Provides additive camera endpoints for external Wi-Fi / IP cameras (e.g. HDWifiCamPro):
- POST /api/camera/test
- POST /api/camera/connect
- GET  /api/camera/status
- POST /api/camera/disconnect
- GET  /api/camera/mjpeg
"""

import time
from typing import Optional
from pydantic import BaseModel

try:
    from fastapi import FastAPI, HTTPException, Response
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse
except ImportError:
    FastAPI = None

from backend.app.camera.camera_manager import (
    camera_manager,
    redact_url_credentials,
    is_hdwificampro_device_id
)

if FastAPI is not None:
    app = FastAPI(
        title="Smart Examination Hall Monitoring - Camera API",
        version="2.5.0",
        description="External Wi-Fi (HDWifiCamPro/RTSP/ONVIF) Camera Manager for Exam Monitoring"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class CameraTestRequest(BaseModel):
        stream_url: str
        username: Optional[str] = ""
        password: Optional[str] = ""
        timeout_seconds: Optional[int] = 8

    class CameraConnectRequest(BaseModel):
        stream_url: str
        username: Optional[str] = ""
        password: Optional[str] = ""
        transport: Optional[str] = "auto"

    @app.get("/api/health")
    def health_check():
        return {
            "status": "operational",
            "service": "Smart Examination Hall Monitoring Camera Service",
            "timestamp": time.time(),
            "capabilities": ["network_camera", "rtsp", "mjpeg", "hdwificampro_bridge"]
        }

    @app.post("/api/camera/test")
    def test_camera_connection(req: CameraTestRequest):
        """
        Tests the network stream connection:
        1. Probes the stream URL
        2. Reads test frames
        3. Measures resolution & FPS
        4. Reports success or actionable error message
        """
        result = camera_manager.test_stream_connection(
            stream_url=req.stream_url,
            username=req.username or "",
            password=req.password or "",
            timeout_seconds=req.timeout_seconds or 8
        )
        return result

    @app.post("/api/camera/connect")
    def connect_camera(req: CameraConnectRequest):
        """Connects the external camera and begins continuous frame capture."""
        result = camera_manager.connect(
            stream_url=req.stream_url,
            username=req.username or "",
            password=req.password or "",
            transport=req.transport or "auto"
        )
        return result

    @app.get("/api/camera/status")
    def get_camera_status():
        """Returns the current camera connection status without exposing passwords."""
        return camera_manager.get_status()

    @app.post("/api/camera/disconnect")
    def disconnect_camera():
        """Disconnects the external camera and releases resources."""
        return camera_manager.disconnect()

    @app.get("/api/camera/mjpeg")
    def stream_mjpeg():
        """Streams real-time MJPEG video from the connected external camera."""
        def frame_generator():
            while True:
                jpeg_bytes = camera_manager.get_latest_jpeg()
                if jpeg_bytes is not None:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"
                    )
                time.sleep(0.04)  # ~25 FPS

        return StreamingResponse(
            frame_generator(),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )

    @app.get("/api/camera/frame")
    def get_single_frame():
        """Returns the latest single frame as JPEG image for snapshotting or AI inspection."""
        jpeg_bytes = camera_manager.get_latest_jpeg()
        if jpeg_bytes is None:
            raise HTTPException(status_code=503, detail="No video frame available. Camera not connected.")
        return Response(content=jpeg_bytes, media_type="image/jpeg")

else:
    app = None
    print("[WARNING] FastAPI is not installed. To run the Python camera service: pip install fastapi uvicorn opencv-python")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
