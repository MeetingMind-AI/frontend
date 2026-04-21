# Agile Meeting Moderator

A real-time meeting moderation assistant powered by Flask, SocketIO, and Vexa's transcription API. A Vexa bot joins your Google Meet call and streams live transcripts, which are fed into an AI moderation pipeline to generate notes, action items, and summaries.

## Stack

- **Backend:** Python Flask + Flask-SocketIO
- **Transcription:** [Vexa API](https://vexa.ai) — bot joins the meeting and streams transcript via WebSocket
- **AI Moderation:** OpenAI-powered pipeline (`moderator.py`) for notes, action items, and summaries
- **Frontend:** Vanilla HTML/CSS/JS with real-time SocketIO updates

## Features

- Join any Google Meet by pasting the meeting URL
- Live transcript feed with speaker identification
- AI-generated meeting notes and action items updated in real time
- End-of-meeting summary drawer
- Footer stats (word count, speaker turns, duration)

## Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment** — create a `.env` file:
   ```
   VEXA_API_KEY=your_vexa_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the server**
   ```bash
   python server.py
   ```

4. Open `http://localhost:5000`, paste a Google Meet URL, and click **Join**.

## File Structure

```
server.py          # Flask app, SocketIO handlers, API routes
vexa.py            # Vexa bot management and WebSocket transcript stream
moderator.py       # AI notes/moderation pipeline
templates/
  index.html       # Frontend UI
.env               # API keys (not committed)
requirements.txt   # Python dependencies
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/join` | Start a Vexa bot for the given `meeting_url` |
| POST | `/api/leave` | Stop the bot and close the WebSocket stream |
| POST | `/api/summary` | Generate a meeting summary |

## SocketIO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `transcript` | server → client | `{ text, speaker }` |
| `moderation` | server → client | `{ notes, action_items }` |
| `status_update` | server → client | `{ status }` |
| `call_detected` | server → client | — |
| `call_ended` | server → client | — |
