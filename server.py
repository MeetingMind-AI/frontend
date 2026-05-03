import eventlet
eventlet.monkey_patch()

import os
import re
import json
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO
from vexa import VexaManager
from moderator import Moderator

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "agile-secret")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

_moderator: Moderator | None = None
_transcript_log: list[dict] = []

def process_transcript_chunk(text: str, speaker: str):
    if _moderator:
        _moderator.add_transcript(text, speaker)

vexa_manager = VexaManager(socketio, on_transcript_callback=process_transcript_chunk)

def _on_moderation(data: str):
    try:
        parsed = json.loads(data)
    except Exception:
        parsed = {"raw": data}
    socketio.emit("moderation", parsed)


def _extract_meeting_id(url: str) -> str:
    return vexa_manager.extract_meeting_id(url)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/join", methods=["POST"])
def api_join():
    global _moderator, _transcript_log
    data = request.get_json(force=True)
    meeting_url = data.get("meeting_url", "").strip()
    if not meeting_url:
        return jsonify({"error": "meeting_url required"}), 400

    _transcript_log = []
    _moderator = Moderator(on_moderation=_on_moderation)

    success = vexa_manager.join_meeting(meeting_url)
    if success:
        return jsonify({"native_meeting_id": _extract_meeting_id(meeting_url)})
    return jsonify({"error": "Failed to join meeting"}), 500

@app.route("/api/leave", methods=["POST"])
def api_leave():
    data = request.get_json(force=True) or {}
    meeting_url = data.get("meeting_url", "")
    if meeting_url:
        vexa_manager.leave_meeting(meeting_url)
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
