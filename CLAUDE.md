# Vexa Frontend - Developer Integration Guide

This document serves as the AI assistant and developer guide for working on the Vexa Frontend (Dashboard). It explains how the frontend integrates with the wider Vexa ecosystem, including the real-time transcription systems and bot management APIs.

## 🏗️ Backend Architecture Overview (How Vexa Works)

To effectively build the frontend, it is crucial to understand the Vexa backend architecture:

1. **API Gateway**: The central routing point (`http://localhost:8056` for Vexa Lite, or `https://api.cloud.vexa.ai` for hosted). It serves both REST and WebSocket traffic.
2. **Bot Manager & Vexa Bot**: The services responsible for spinning up headless bots to join Google Meet, Teams, and Zoom. They capture audio and handle interactive controls (speak, chat, screen, avatar).
3. **WhisperLive**: The real-time transcription engine. It uses a **LIFO + Algorithm A** buffer management system for remote connections. It strictly manages incoming audio chunks to ensure live transcription is sub-second, and handles reconfirmation of partial segments (hallucination filtering, VAD silence cutting).
4. **Transcription Collector**: The central data aggregator that processes segments from WhisperLive via Redis.
   * **Single Redis Cache**: Live segments are stored at `meeting:{meeting_id}:segments`.
   * **Change-Only Mutable Publishing**: To avoid spamming the frontend WebSocket, the backend publishes `transcript.mutable` frames **only** when render-relevant fields (text, speaker, language, time) change. 
   * **Persistence**: Stable segments (`updated_at < now - IMMUTABILITY_THRESHOLD`) are automatically flushed to PostgreSQL.

## 🔌 Frontend-Backend Integration Points

### 1. Bot Management (REST)
To send a bot to a meeting from the UI, make a POST request to the `/bots` endpoint.
* **Headers**: `X-API-Key: <YOUR_API_KEY>`
* **Body (Google Meet)**: `{ "platform": "google_meet", "native_meeting_id": "abc-defg-hij" }`
* **Body (Teams)**: Teams requires the numeric meeting ID and the passcode extracted from the Teams link.
* **Body (Zoom)**: Requires `native_meeting_id`, `passcode`, and optionally `recording_enabled`, `transcribe_enabled`.

### 2. Live Transcription Streams (WebSocket)
The UI must rely on WebSockets to display sub-second transcripts during live calls.
* **Events**: Listen for `transcript.mutable` frames over the meeting channel (`tc:meeting:{meeting_id}:mutable`). 
* **Rendering**: Because the backend uses *Change-Only Publishing*, the frontend UI should confidently upsert segments into its state using `absolute_start_time` and `session_uid` as stable keys. 
* **Important Note**: The backend **no longer emits** `transcript.finalized` frames. The UI should rely solely on the `mutable` channel for live updates and the REST API for the finalized historical record.
* **Speaker Events**: Live speaker activity updates are routed through Redis streams and delivered via WebSockets to indicate who is currently talking.

### 3. Historical Transcripts & Meeting Data (REST)
To load past meetings or the full finalized view of an active meeting:
* **Endpoint**: `GET /transcripts/<platform>/<native_meeting_id>`
* **Behavior**: This endpoint merges the immutable data from the PostgreSQL database with the remaining mutable data from the Redis cache, computes absolute times, and deduplicates overlaps.
* **Recordings**: Can be accessed via `/recordings/.../raw` with `Range` seeking (`206 Partial Content`) for native browser audio/video playback support.

## 🧬 Data Structures

When dealing with transcript segments in the UI, expect the following normalized schema from the backend:
```json
{
  "session_uid": "string (UUID)",
  "text": "string",
  "speaker": "string (mapped from speaker events)",
  "language": "string (e.g., 'en')",
  "start_time": "float (relative)",
  "end_time": "float (relative)",
  "absolute_start_time": "string (ISO 8601)",
  "absolute_end_time": "string (ISO 8601)",
  "completed": "boolean"
}
```
*Use `completed: false` to style partial/unstable text (e.g., lower opacity or italics).*

## 💻 Development Commands

*(Assuming standard Node.js based frontend environment)*
- `npm install` - Install frontend dependencies
- `npm run dev` - Start local development server
- `npm run build` - Build for production

**Local Testing Environment**:
Make sure the Vexa backend is running locally via Docker Compose (`make all` from the root Vexa directory) before starting the frontend, and point your local `.env` `API_BASE` to `http://localhost:8056`.

## 🤖 Claude/AI Assistant Prompting Guidelines
- Prioritize fetching the latest WebSocket payload shapes from the API gateway when adding new transcription rendering logic.
- Be mindful of the "Change-Only" architecture: do not create local debouncing logic for transcription updates, as the backend collector already optimizes the payload delivery.
- Always use absolute paths for routing imports inside the frontend source tree.
