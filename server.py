import eventlet
eventlet.monkey_patch()

import os
import threading
import requests
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO
from vexa import VexaManager

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "agile-secret")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

_current_meeting_id: int | None = None
_ai_notes: list[str] = []
_notes_lock = threading.Lock()


def _on_summary(summary: str):
    with _notes_lock:
        _ai_notes.append(summary)


vexa_manager = VexaManager(socketio, backend_url=BACKEND_URL, on_summary=_on_summary)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/join", methods=["POST"])
def api_join():
    global _current_meeting_id, _ai_notes
    data = request.get_json(force=True)
    meeting_url = data.get("meeting_url", "").strip()
    if not meeting_url:
        return jsonify({"error": "meeting_url required"}), 400

    native_id = vexa_manager.extract_meeting_id(meeting_url)

    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/meetings/start",
            json={"platform": "google_meet", "native_id": native_id},
            timeout=15,
        )
        resp.raise_for_status()
        meeting_id = resp.json()["meeting_id"]
    except Exception as e:
        return jsonify({"error": f"Backend error: {e}"}), 502

    _current_meeting_id = meeting_id
    with _notes_lock:
        _ai_notes = []

    success = vexa_manager.join_meeting(meeting_url, meeting_id)
    if success:
        return jsonify({"native_meeting_id": native_id, "meeting_id": meeting_id})
    return jsonify({"error": "Failed to start Vexa listener"}), 500


@app.route("/api/leave", methods=["POST"])
def api_leave():
    global _current_meeting_id
    data = request.get_json(force=True) or {}
    meeting_url = data.get("meeting_url", "")

    mid = _current_meeting_id
    if mid is not None:
        try:
            requests.post(f"{BACKEND_URL}/api/meetings/{mid}/leave", timeout=10)
        except Exception:
            pass

    if meeting_url:
        vexa_manager.leave_meeting(meeting_url)

    _current_meeting_id = None
    return jsonify({"status": "left"})


@app.route("/api/summary", methods=["GET"])
def api_summary():
    with _notes_lock:
        notes = list(_ai_notes)
    if not notes:
        return jsonify({"summary": "No AI insights captured yet."})
    return jsonify({"summary": "\n\n".join(notes)})


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
