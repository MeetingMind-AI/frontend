import eventlet
eventlet.monkey_patch()

import os
import re
import json
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO
from vexa import VexaBot
from moderator import Moderator

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "agile-secret")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

_bot: VexaBot | None = None
_moderator: Moderator | None = None
_transcript_log: list[dict] = []
_seen_segments: dict[str, str] = {}  # segment_id -> last text


def _start_bot_and_stream(native_id: str):
    global _bot
    try:
        _bot.start(native_id)
        socketio.emit("status_update", {"status": "joining"})
    except Exception as e:
        socketio.emit("status_update", {"status": f"error: {e}"})
        return

    def on_segments(segments):
        for seg in segments:
            # Use segment_id if present; fall back to start timestamp as key
            sid = seg.get("segment_id") or str(seg.get("start", ""))
            text = (seg.get("text") or "").strip()
            speaker = seg.get("speaker") or "Unknown"
            completed = seg.get("completed", False)

            if not sid or not text:
                continue

            prev_text = _seen_segments.get(sid)

            if prev_text is None:
                _seen_segments[sid] = text
                socketio.emit("transcript_new", {
                    "segment_id": sid,
                    "text": text,
                    "speaker": speaker,
                    "completed": completed,
                })
            elif text != prev_text:
                _seen_segments[sid] = text
                socketio.emit("transcript_update", {
                    "segment_id": sid,
                    "text": text,
                    "completed": completed,
                })

            if completed and not _seen_segments.get(f"{sid}:fed"):
                _seen_segments[f"{sid}:fed"] = "1"
                _transcript_log.append({"text": text, "speaker": speaker})
                if _moderator:
                    _moderator.add_transcript(text, speaker)

    def on_connected():
        socketio.emit("status_update", {"status": "connected"})

    def on_end():
        global _bot
        socketio.emit("status_update", {"status": "left"})
        if _bot:
            bot_ref = _bot
            _bot = None
            bot_ref.active = False
            bot_ref.stop()

    _bot.stream(on_segments, on_connected=on_connected, on_end=on_end)


def _on_moderation(data: str):
    try:
        parsed = json.loads(data)
    except Exception:
        parsed = {"raw": data}
    socketio.emit("moderation", parsed)


def _extract_meeting_id(url: str) -> str:
    match = re.search(r"meet\.google\.com/([a-z0-9\-]+)", url, re.IGNORECASE)
    if match:
        return match.group(1)
    return url.strip("/").split("/")[-1]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/join", methods=["POST"])
def api_join():
    global _bot, _moderator, _transcript_log, _seen_segments
    data = request.get_json(force=True)
    meeting_url = data.get("meeting_url", "").strip()
    if not meeting_url:
        return jsonify({"error": "meeting_url required"}), 400

    if _bot:
        _bot.stop()

    _transcript_log = []
    _seen_segments = {}
    _moderator = Moderator(on_moderation=_on_moderation)
    _bot = VexaBot()

    native_id = _extract_meeting_id(meeting_url)
    socketio.start_background_task(_start_bot_and_stream, native_id)

    return jsonify({"native_meeting_id": native_id})


@app.route("/api/leave", methods=["POST"])
def api_leave():
    global _bot
    if _bot:
        bot_ref = _bot
        _bot = None
        socketio.start_background_task(bot_ref.stop)
    socketio.emit("status_update", {"status": "left"})
    return jsonify({"status": "left"})


@app.route("/api/summary", methods=["GET"])
def api_summary():
    if not _moderator:
        return jsonify({"summary": "No meeting in progress."})
    result = _moderator.get_summary()
    try:
        return jsonify(json.loads(result))
    except Exception:
        return jsonify({"summary": result})


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
