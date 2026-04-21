import os
import json
import requests
import websocket
from dotenv import load_dotenv

load_dotenv()

VEXA_API_KEY = os.getenv("VEXA_API_KEY")
VEXA_BASE_URL = "https://api.cloud.vexa.ai"

_headers = {"X-API-Key": VEXA_API_KEY, "Content-Type": "application/json"}


class VexaBot:
    def __init__(self):
        self.native_meeting_id = None
        self.active = False
        self._ws = None
        self._ws_url = None

    def start(self, native_meeting_id: str):
        """POST a bot into the meeting and capture the WebSocket URL from the response."""
        self.native_meeting_id = native_meeting_id
        self.active = True
        payload = {"platform": "google_meet", "native_meeting_id": native_meeting_id}
        resp = requests.post(f"{VEXA_BASE_URL}/bots", json=payload, headers=_headers, timeout=15)
        if resp.status_code == 409:
            return
        if resp.status_code not in (200, 201):
            resp.raise_for_status()
        body = resp.json()
        self._ws_url = (
            body.get("ws_url")
            or body.get("websocket_url")
            or body.get("stream_url")
        )

    def stop(self):
        """Close the WebSocket and remove the bot from the meeting."""
        self.active = False
        if self._ws:
            try:
                self._ws.close()
            except Exception:
                pass
            self._ws = None
        if self.native_meeting_id:
            try:
                requests.delete(
                    f"{VEXA_BASE_URL}/bots/google_meet/{self.native_meeting_id}",
                    headers=_headers,
                    timeout=10,
                )
            except Exception:
                pass
            self.native_meeting_id = None

    def stream(self, on_segments, on_connected=None, on_end=None):
        """
        Connect to Vexa's WebSocket and call on_segments(list) for each message.
        Blocks the calling greenlet until the connection closes.
        Falls back to REST polling if no WebSocket URL was returned by the bot.
        """
        if self._ws_url:
            self._ws_stream(on_segments, on_connected, on_end)
        else:
            self._poll_fallback(on_segments, on_connected, on_end)

    # ── WebSocket path ──────────────────────────────────────────────────────────

    def _ws_stream(self, on_segments, on_connected, on_end):
        def _on_open(ws):
            if on_connected:
                on_connected()

        def _on_message(ws, message):
            if not self.active:
                ws.close()
                return
            try:
                data = json.loads(message)
                if "transcript" in data.get("type", ""):
                    segs = data.get("segments", [])
                    if segs:
                        on_segments(segs)
            except Exception:
                pass

        def _on_close(ws, code, msg):
            if on_end and self.active:
                on_end()

        def _on_error(ws, error):
            pass

        self._ws = websocket.WebSocketApp(
            self._ws_url,
            header={"X-API-Key": VEXA_API_KEY},
            on_open=_on_open,
            on_message=_on_message,
            on_close=_on_close,
            on_error=_on_error,
        )
        self._ws.run_forever()

    # ── REST polling fallback ───────────────────────────────────────────────────

    def _poll_fallback(self, on_segments, on_connected, on_end):
        import eventlet
        if on_connected:
            on_connected()
        while self.active and self.native_meeting_id:
            try:
                url = f"{VEXA_BASE_URL}/transcripts/google_meet/{self.native_meeting_id}"
                resp = requests.get(url, headers=_headers, timeout=10)
                if resp.status_code == 200:
                    segs = resp.json().get("segments", [])
                    if segs:
                        on_segments(segs)
            except Exception:
                pass
            eventlet.sleep(1)
        if on_end and self.active:
            on_end()
