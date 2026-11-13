#!/usr/bin/env python3
"""
Smart Examination Hall Monitoring System - Modular Camera Manager
=================================================================
File: backend/app/camera/camera_manager.py

Handles:
- Connecting to external Wi-Fi / IP / RTSP / HTTP network cameras (e.g. HDWifiCamPro)
- Background frame reading & buffering with thread safety
- Exposing frames to the examination hall AI pipeline
- Detecting connection failures & automatic reconnection
- Stream testing & verification (POST /api/camera/test)
- Clean resource acquisition and release
- Credential redaction (passwords never exposed in logs or responses)
"""

import re
import time
import queue
import logging
import threading
from urllib.parse import urlparse
from typing import Dict, Any, Optional, Tuple

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ExamHallCameraManager")


def redact_url_credentials(url: str) -> str:
    """
    Sanitize stream URL so passwords are never exposed in logs, API responses, or WebSockets.
    Example: rtsp://admin:secret123@192.168.1.100:554/live -> rtsp://admin:***@192.168.1.100:554/live
    """
    if not url:
        return ""
    # Redact user:password@ pattern
    return re.sub(r"://([^:@\s]+):([^@\s]+)@", r"://\1:***@", url)


def is_hdwificampro_device_id(raw_str: str) -> bool:
    """
    Detect if user input is an HDWifiCamPro Cloud P2P Device ID / UID instead of a network stream URL.
    Typical HDWifiCamPro device IDs look like:
    - DGK-123456-ABCDE
    - AJ-987654321
    - D082729124ABC
    - 16-24 character alphanumeric string without :// protocol
    """
    cleaned = raw_str.strip()
    if "://" in cleaned:
        return False
    # Check if string matches typical cloud UID pattern
    if re.match(r"^[A-Za-z0-9\-_]{8,32}$", cleaned) and not cleaned.startswith("http") and not cleaned.startswith("rtsp"):
        return True
    return False


class NetworkCameraManager:
    """
    Modular Network Camera Manager for External Wi-Fi Security Cameras.
    Designed for HDWifiCamPro, generic ONVIF, RTSP, and HTTP/MJPEG streams.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._cap: Optional[Any] = None
        self._thread: Optional[threading.Thread] = None
        self._is_running: bool = False
        self._is_reconnecting: bool = False

        self._stream_url: str = ""
        self._username: str = ""
        self._password: str = ""
        self._transport: str = "auto"

        self._status: str = "disconnected"  # connected | disconnected | connecting | error
        self._error_message: Optional[str] = None
        self._resolution: str = "Unknown"
        self._fps: float = 0.0
        self._frames_processed: int = 0
        self._last_frame: Optional[Any] = None
        self._last_frame_jpeg: Optional[bytes] = None
        self._last_frame_time: float = 0.0

        self._fps_counter = 0
        self._fps_timer = time.time()
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 10

    @classmethod
    def test_stream_connection(
        cls,
        stream_url: str,
        username: str = "",
        password: str = "",
        timeout_seconds: int = 8
    ) -> Dict[str, Any]:
        """
        Tests the supplied stream without keeping it permanently open:
        1. Validates stream URL format
        2. Checks for HDWifiCamPro Device ID limitation
        3. Attempts connection
        4. Reads several frames to verify real video flow
        5. Determines resolution & approximate FPS
        6. Returns detailed status & helpful error messages
        """
        cleaned_url = stream_url.strip()
        if not cleaned_url:
            return {
                "success": False,
                "status": "error",
                "error": "Stream URL is required.",
                "message": "Please provide an RTSP, HTTP, or MJPEG stream URL."
            }

        # Check if the user entered an HDWifiCamPro Cloud Device ID
        if is_hdwificampro_device_id(cleaned_url):
            return {
                "success": False,
                "status": "error",
                "error": (
                    f"HDWifiCamPro Device ID detected ('{cleaned_url}'). "
                    "The Device ID is a cloud P2P relay identifier for the mobile app, "
                    "not a direct local network video stream. To connect this camera to the monitoring system, "
                    "connect the camera to your 2.4GHz Wi-Fi router, locate its local LAN IP address "
                    "(e.g., from your router DHCP list or an IP scanner such as Fing/Angry IP), and enter its "
                    "local RTSP or HTTP MJPEG URL (e.g. rtsp://192.168.1.X:554/live/ch0 or http://192.168.1.X:8080/stream)."
                ),
                "message": "Device ID cannot be accessed directly without local IP stream URL."
            }

        if cv2 is None:
            # Fallback simulated response when OpenCV isn't installed in the Python environment
            return {
                "success": False,
                "status": "error",
                "error": "OpenCV (cv2) is not installed in this Python environment. Install with: pip install opencv-python",
                "message": "OpenCV required for native RTSP decoding."
            }

        # Build final probe URL with credentials if specified separately
        probe_url = cls._build_authenticated_url(cleaned_url, username, password)
        redacted = redact_url_credentials(probe_url)

        logger.info(f"Testing network camera connection to: {redacted}")

        try:
            # Attempt to open capture with timeout
            cap = cv2.VideoCapture(probe_url)

            # Set probe timeouts if supported
            if hasattr(cv2, 'CAP_PROP_OPEN_TIMEOUT_MSEC'):
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, timeout_seconds * 1000)
            if hasattr(cv2, 'CAP_PROP_READ_TIMEOUT_MSEC'):
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)

            if not cap.isOpened():
                cap.release()
                return {
                    "success": False,
                    "status": "error",
                    "error": (
                        f"Failed to open stream at '{redacted}'. Connection refused, timeout, or invalid path. "
                        "Verify that: 1) The camera is powered on and connected to the same Wi-Fi router; "
                        "2) The IP address and port (usually 554 for RTSP, 8080/80 for HTTP) are correct; "
                        "3) Username and password are correct."
                    ),
                    "message": "Connection timed out or refused."
                }

            # Read several test frames to confirm real video arrival
            frames_read = 0
            start_time = time.time()
            width = 0
            height = 0

            for _ in range(8):
                ret, frame = cap.read()
                if ret and frame is not None:
                    frames_read += 1
                    if width == 0:
                        height, width = frame.shape[:2]
                time.sleep(0.04)

            cap.release()

            if frames_read == 0:
                return {
                    "success": False,
                    "status": "error",
                    "error": (
                        f"Connected to '{redacted}' but received 0 valid video frames. "
                        "The stream endpoint may be invalid, password protected, or waiting on codec negotiation."
                    ),
                    "message": "No video frames received from stream."
                }

            elapsed = max(0.1, time.time() - start_time)
            measured_fps = round(frames_read / elapsed, 1)
            reported_fps = cap.get(cv2.CAP_PROP_FPS) if hasattr(cap, 'get') else 0
            final_fps = int(reported_fps if reported_fps > 0 and reported_fps < 120 else measured_fps)
            res_str = f"{width}x{height}" if width > 0 else "1280x720"

            logger.info(f"Stream verified successfully: {res_str} @ ~{final_fps} FPS ({frames_read} frames)")

            return {
                "success": True,
                "status": "connected",
                "resolution": res_str,
                "fps": max(15, min(60, final_fps)),
                "frames_received": frames_read,
                "message": f"Stream verified successfully. Receiving {res_str} video at ~{final_fps} FPS."
            }

        except Exception as ex:
            logger.error(f"Error testing stream {redacted}: {ex}")
            return {
                "success": False,
                "status": "error",
                "error": f"Connection error: {str(ex)}",
                "message": "Exception occurred while probing stream."
            }

    @staticmethod
    def _build_authenticated_url(url: str, username: str, password: str) -> str:
        """Embed credentials into URL if not already present."""
        if not username and not password:
            return url
        parsed = urlparse(url)
        if parsed.username or parsed.password:
            return url
        # If user/pass provided separately and not in URL
        if parsed.scheme in ("rtsp", "http", "https"):
            user_part = f"{username}:{password}@" if password else f"{username}@"
            netloc = f"{user_part}{parsed.hostname or ''}"
            if parsed.port:
                netloc += f":{parsed.port}"
            return parsed._replace(netloc=netloc).geturl()
        return url

    def connect(
        self,
        stream_url: str,
        username: str = "",
        password: str = "",
        transport: str = "auto"
    ) -> Dict[str, Any]:
        """
        Connects to the network camera and starts continuous background frame acquisition.
        """
        self.disconnect()

        cleaned_url = stream_url.strip()
        if not cleaned_url:
            self._status = "error"
            self._error_message = "Stream URL is required."
            return {"success": False, "status": "error", "error": self._error_message}

        if is_hdwificampro_device_id(cleaned_url):
            self._status = "error"
            self._error_message = (
                f"HDWifiCamPro Device ID ('{cleaned_url}') cannot be opened as a direct video stream. "
                "Please provide the camera's local Wi-Fi RTSP or HTTP MJPEG URL (e.g. rtsp://192.168.1.X:554/live/ch0)."
            )
            return {"success": False, "status": "error", "error": self._error_message}

        self._stream_url = cleaned_url
        self._username = username
        self._password = password
        self._transport = transport
        self._status = "connecting"
        self._error_message = None
        self._reconnect_attempts = 0

        final_url = self._build_authenticated_url(cleaned_url, username, password)

        # First verify connection
        test_res = self.test_stream_connection(final_url)
        if not test_res.get("success"):
            self._status = "error"
            self._error_message = test_res.get("error", "Stream verification failed.")
            return {"success": False, "status": "error", "error": self._error_message}

        self._resolution = test_res.get("resolution", "1280x720")
        self._fps = test_res.get("fps", 25)

        # Launch background acquisition thread
        self._is_running = True
        self._thread = threading.Thread(target=self._capture_worker, daemon=True, name="CameraCaptureWorker")
        self._thread.start()

        self._status = "connected"
        logger.info(f"Connected to network camera: {redact_url_credentials(final_url)} ({self._resolution})")

        return {
            "success": True,
            "status": "connected",
            "camera_name": "External Network Camera (HDWifiCamPro / RTSP)",
            "resolution": self._resolution,
            "fps": self._fps,
            "stream_url": redact_url_credentials(self._stream_url)
        }

    def _capture_worker(self):
        """Background thread continuously reading frames from OpenCV VideoCapture."""
        probe_url = self._build_authenticated_url(self._stream_url, self._username, self._password)

        while self._is_running:
            try:
                if cv2 is None:
                    time.sleep(1.0)
                    continue

                cap = cv2.VideoCapture(probe_url)
                if not cap.isOpened():
                    self._handle_disconnect("Unable to open network stream.")
                    time.sleep(2.0)
                    continue

                with self._lock:
                    self._cap = cap
                    self._status = "connected"
                    self._error_message = None
                    self._is_reconnecting = False

                while self._is_running:
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        logger.warning("Network camera stream interrupted or frame drop.")
                        break

                    now = time.time()
                    with self._lock:
                        self._last_frame = frame
                        self._last_frame_time = now
                        self._frames_processed += 1
                        self._fps_counter += 1

                        # Periodic FPS update
                        if now - self._fps_timer >= 1.0:
                            self._fps = round(self._fps_counter / (now - self._fps_timer), 1)
                            self._fps_counter = 0
                            self._fps_timer = now

                        # Cache JPEG encoding for HTTP stream endpoint
                        ret_jpg, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                        if ret_jpg:
                            self._last_frame_jpeg = buffer.tobytes()

                    # Throttle to prevent CPU burn
                    time.sleep(0.01)

                cap.release()

            except Exception as ex:
                logger.error(f"Error in camera capture worker: {ex}")
                self._handle_disconnect(str(ex))

            if self._is_running:
                # Attempt reconnect
                self._is_reconnecting = True
                self._status = "connecting"
                time.sleep(2.0)

    def _handle_disconnect(self, reason: str):
        with self._lock:
            self._status = "disconnected"
            self._error_message = f"Camera disconnected: {reason}"
        logger.warning(f"Network camera disconnected: {reason}. IMPORTANT: User must select another source.")

    def disconnect(self):
        """Stops streaming and cleans up all OpenCV and thread resources."""
        self._is_running = False
        with self._lock:
            if self._cap is not None:
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None
            self._status = "disconnected"
            self._last_frame = None
            self._last_frame_jpeg = None
            self._error_message = None

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
            self._thread = None

        logger.info("Network camera disconnected and resources released.")
        return {"success": True, "status": "disconnected"}

    def get_latest_frame(self) -> Optional[Any]:
        """Returns the raw NumPy BGR frame for the existing AI detection pipeline."""
        with self._lock:
            return self._last_frame

    def get_latest_jpeg(self) -> Optional[bytes]:
        """Returns the latest frame encoded as JPEG bytes."""
        with self._lock:
            return self._last_frame_jpeg

    def get_status(self) -> Dict[str, Any]:
        """Returns the current operational status with credentials fully redacted."""
        with self._lock:
            return {
                "status": self._status,
                "camera_source": "network",
                "stream_url": redact_url_credentials(self._stream_url),
                "resolution": self._resolution,
                "fps": self._fps,
                "frames_processed": self._frames_processed,
                "is_reconnecting": self._is_reconnecting,
                "error_message": self._error_message,
                "last_frame_time": self._last_frame_time
            }


# Global singleton instance
camera_manager = NetworkCameraManager()
