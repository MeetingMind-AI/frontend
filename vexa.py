import os
import json
import threading
import websocket
from dotenv import load_dotenv

load_dotenv()

VEXA_API_KEY = os.getenv("VEXA_API_KEY")
VEXA_API_BASE = os.getenv("VEXA_API_BASE", "https://api.cloud.vexa.ai")


class VexaManager:
    def __init__(self, socketio, backend_url, on_summary=None):
        self.socketio = socketio
        self.backend_url = backend_url
        self.on_summary = on_summary
        self.ws_clients = {}    # native_id -> Vexa WebSocketApp
        self.backend_ws = {}    # meeting_id (int) -> backend WebSocketApp
        self.seen_segments = {}

    def extract_meeting_id(self, url):
        return url.rstrip('/').split('/')[-1].split('?')[0]

    def join_meeting(self, meeting_url, meeting_id):
        native_id = self.extract_meeting_id(meeting_url)
        self.socketio.emit("status_update", {"status": "joining"})

        ws_base = VEXA_API_BASE.replace("http", "ws")
        ws_url = f"{ws_base}/ws/meeting/{native_id}"

        self._start_websocket(native_id, ws_url, meeting_id)
        self._start_backend_ws(meeting_id)
        return True

    def _start_backend_ws(self, meeting_id):
        ws_base = self.backend_url.replace("http://", "ws://").replace("https://", "wss://")
        url = f"{ws_base}/api/ws/ingest/{meeting_id}"

        def on_message(ws, message):
            try:
                data = json.loads(message)
                summary_data = data.get("summary")
                if not summary_data:
                    return
                # controller.summarize() returns dict[role -> text]
                if isinstance(summary_data, dict):
                    for role, text in summary_data.items():
                        text = (text or "").strip()
                        if text and text.upper() != "IGNORE":
                            self.socketio.emit("moderation", {"role": role, "summary": text})
                            if self.on_summary:
                                self.on_summary(text)
                else:
                    text = str(summary_data).strip()
                    if text and text.upper() != "IGNORE":
                        self.socketio.emit("moderation", {"summary": text})
                        if self.on_summary:
                            self.on_summary(text)
            except Exception as e:
                print(f"[Backend WS] Parse error: {e}")

        def on_error(ws, error):
            print(f"[Backend WS] Error: {error}")

        def on_close(ws, *args):
            print(f"[Backend WS] Closed for meeting {meeting_id}")

        def on_open(ws):
            print(f"[Backend WS] Connected for meeting {meeting_id}")

        ws_app = websocket.WebSocketApp(
            url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )
        self.backend_ws[meeting_id] = ws_app
        threading.Thread(target=ws_app.run_forever, daemon=True).start()

    def _send_to_backend(self, meeting_id, speaker, text):
        ws_app = self.backend_ws.get(meeting_id)
        if not ws_app:
            return
        try:
            ws_app.send(json.dumps({"speaker": speaker, "text": text}))
        except Exception as e:
            print(f"[Backend WS] Send error: {e}")

    def _start_websocket(self, native_id, ws_url, meeting_id):
        def on_message(ws, message):
            try:
                data = json.loads(message)
                if data.get("type") == "transcript.mutable" or "segments" in data:
                    for segment in data.get("segments", []):
                        sid = segment.get("session_uid") or str(
                            segment.get("start", segment.get("absolute_start_time", ""))
                        )
                        text = (segment.get("text") or "").strip()
                        speaker = segment.get("speaker", "Unknown Speaker")
                        completed = segment.get("completed", False)

                        if not sid or not text:
                            continue

                        prev_text = self.seen_segments.get(sid)
                        if prev_text is None:
                            self.seen_segments[sid] = text
                            self.socketio.emit("transcript_new", {
                                "segment_id": sid,
                                "text": text,
                                "speaker": speaker,
                                "completed": completed,
                            })
                        elif text != prev_text:
                            self.seen_segments[sid] = text
                            self.socketio.emit("transcript_update", {
                                "segment_id": sid,
                                "text": text,
                                "completed": completed,
                            })

                        if completed and not self.seen_segments.get(f"{sid}:sent"):
                            self.seen_segments[f"{sid}:sent"] = "1"
                            self._send_to_backend(meeting_id, speaker, text)
            except Exception as e:
                print(f"[Vexa] WebSocket parse error: {e}")

        def on_error(ws, error):
            self.socketio.emit("status_update", {"status": f"error: {str(error)}"})

        def on_close(ws, close_status_code, close_msg):
            self.socketio.emit("status_update", {"status": "left"})

        def on_open(ws):
            self.socketio.emit("status_update", {"status": "connected"})

        ws_app = websocket.WebSocketApp(
            ws_url,
            header=[f"X-API-Key: {VEXA_API_KEY}"],
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )
        self.ws_clients[native_id] = ws_app
        threading.Thread(target=ws_app.run_forever, daemon=True).start()

    def leave_meeting(self, meeting_url):
        native_id = self.extract_meeting_id(meeting_url)

        ws_app = self.ws_clients.pop(native_id, None)
        if ws_app:
            ws_app.close()

        for bws in list(self.backend_ws.values()):
            try:
                bws.close()
            except Exception:
                pass
        self.backend_ws.clear()

        self.socketio.emit("status_update", {"status": "left"})
