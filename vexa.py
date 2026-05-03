import os
import json
import requests
import threading
import websocket
from dotenv import load_dotenv

load_dotenv()

# Core Vexa API Configuration
VEXA_API_KEY = os.getenv("VEXA_API_KEY")
VEXA_API_BASE = os.getenv("VEXA_API_BASE", "https://api.cloud.vexa.ai")

class VexaManager:
    def __init__(self, socketio, on_transcript_callback=None):
        """
        :param socketio: The Flask-SocketIO instance to emit events to the frontend.
        :param on_transcript_callback: Optional function to pipe text to moderator.py
        """
        self.socketio = socketio
        self.on_transcript_callback = on_transcript_callback
        self.active_bots = {}  # Map meeting_id -> bot_id
        self.ws_clients = {}   # Map meeting_id -> WebSocket instance
        self.seen_segments = {} # Map segment_id -> last text

    def extract_meeting_id(self, url):
        """Extract the native meeting ID from a Google Meet URL."""
        # e.g., https://meet.google.com/abc-defg-hij -> abc-defg-hij
        return url.rstrip('/').split('/')[-1].split('?')[0]

    def join_meeting(self, meeting_url):
        """Trigger Vexa Bot Manager to join a meeting and start WebSocket stream."""
        meeting_id = self.extract_meeting_id(meeting_url)
        self.socketio.emit("status_update", {"status": "joining"})

        headers = {
            "X-API-Key": VEXA_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "platform": "google_meet",
            "native_meeting_id": meeting_id
        }

        try:
            # 1. Post to Vexa API to send the bot
            response = requests.post(f"{VEXA_API_BASE}/bots", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            bot_id = data.get("id") or data.get("bot_id")
            self.active_bots[meeting_id] = bot_id

            # 2. Get the stream URL and start WebSocket
            ws_url = data.get("stream_url")
            if not ws_url:
                # Fallback based on typical Vexa architecture API Gateway
                ws_base = VEXA_API_BASE.replace("http", "ws")
                ws_url = f"{ws_base}/ws/meeting/{meeting_id}"

            self._start_websocket(meeting_id, ws_url)
            return True
        except Exception as e:
            self.socketio.emit("status_update", {"status": "error", "message": str(e)})
            return False

    def _start_websocket(self, meeting_id, ws_url):
        def on_message(ws, message):
            try:
                data = json.loads(message)
                # Handle Vexa's "transcript.mutable" frames
                if data.get("type") == "transcript.mutable" or "segments" in data:
                    for segment in data.get("segments", []):
                        sid = segment.get("session_uid") or str(segment.get("start", segment.get("absolute_start_time", "")))
                        text = (segment.get("text") or "").strip()
                        speaker = segment.get("speaker", "Unknown Speaker")
                        completed = segment.get("completed", False)
                        
                        if not sid or not text:
                            continue

                        prev_text = self.seen_segments.get(sid)

                        if prev_text is None:
                            self.seen_segments[sid] = text
                            self.socketio.emit("transcript_new", {"segment_id": sid, "text": text, "speaker": speaker, "completed": completed})
                        elif text != prev_text:
                            self.seen_segments[sid] = text
                            self.socketio.emit("transcript_update", {"segment_id": sid, "text": text, "completed": completed})
                            
                        if completed and not self.seen_segments.get(f"{sid}:fed"):
                            self.seen_segments[f"{sid}:fed"] = "1"
                            if self.on_transcript_callback:
                                self.on_transcript_callback(text, speaker)
            except Exception as e:
                print(f"[Vexa] WebSocket Parse Error: {e}")

        def on_error(ws, error):
            self.socketio.emit("status_update", {"status": f"error: {str(error)}"})

        def on_close(ws, close_status_code, close_msg):
            self.socketio.emit("status_update", {"status": "left"})

        def on_open(ws):
            self.socketio.emit("status_update", {"status": "connected"})

        # Start the listener in a background thread
        ws_app = websocket.WebSocketApp(
            ws_url,
            header=[f"X-API-Key: {VEXA_API_KEY}"],
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        self.ws_clients[meeting_id] = ws_app
        threading.Thread(target=ws_app.run_forever, daemon=True).start()

    def leave_meeting(self, meeting_url):
        """Remove the bot from the meeting and close connections."""
        meeting_id = self.extract_meeting_id(meeting_url)
        bot_id = self.active_bots.get(meeting_id)
        
        if bot_id:
            headers = {"X-API-Key": VEXA_API_KEY}
            requests.delete(f"{VEXA_API_BASE}/bots/{bot_id}", headers=headers)
            del self.active_bots[meeting_id]
            
        ws_app = self.ws_clients.get(meeting_id)
        if ws_app:
            ws_app.close()
            del self.ws_clients[meeting_id]
            
        self.socketio.emit("status_update", {"status": "left"})