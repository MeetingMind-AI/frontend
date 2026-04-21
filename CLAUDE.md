I have a working Flask + SocketIO web app for Agile meeting moderation. I need to swap the local Whisper transcription for Vexa's API so a bot joins the meeting and streams the transcript instead.



\## Current stack

\- Python Flask + Flask-SocketIO backend (server.py)

\- Vanilla HTML/CSS/JS frontend (templates/index.html)

\- Real-time updates via SocketIO events: "transcript", "moderation", "call\_detected", "call\_ended", "status\_update"



\## What needs to change

Replace the local audio capture pipeline with Vexa's WebSocket transcript stream. The frontend should stay the same, only the backend data source changes.



\## What I need built



1\. \*\*Vexa integration module (vexa.py)\*\*

&#x20;  - POST to https://api.cloud.vexa.ai/bots to send a bot into a meeting given a meeting ID

&#x20;  - Connect to Vexa's WebSocket and stream real-time transcript segments

&#x20;  - On each transcript segment, emit a SocketIO "transcript" event to the frontend with the text and speaker name

&#x20;  - Handle bot stop (DELETE /bots/{bot\_id})

&#x20;  - Vexa WebSocket docs: transcript messages have type "transcript.mutable" with segments containing text, speaker, and timestamps



2\. \*\*New Flask routes in server.py\*\*

&#x20;  - POST /api/join  { "meeting\_url": "https://meet.google.com/abc-xyz" } → extract meeting ID, start Vexa bot, begin streaming

&#x20;  - POST /api/leave → stop the bot and close WebSocket



3\. \*\*Updated UI (index.html)\*\*

&#x20;  - Replace the auto-detect call banner with a simple input field for the meeting URL and a "Join" button

&#x20;  - Keep the existing transcript feed, AI notes panel, footer stats, and summary drawer exactly as they are

&#x20;  - Show the bot status (joining, connected, left) in the existing status indicator



\## Vexa API details

\- Base URL: https://api.cloud.vexa.ai

\- Auth header: X-API-Key: {api\_key}

\- Start bot: POST /bots { "platform": "google\_meet", "native\_meeting\_id": "abc-defg-hij" }

\- WebSocket: connect to the stream URL returned in the bot response

\- Each WebSocket message is JSON with segments array containing { text, speaker, start, end }



\## API key

Store in a .env file as VEXA\_API\_KEY and load with python-dotenv



\## Keep intact

\- All existing SocketIO events and handlers

\- The AI notes/moderation pipeline (moderator.py) feed Vexa transcript text into it exactly as before

\- The summary endpoint

\- The existing UI design and layout



\## File structure

server.py, vexa.py, moderator.py, templates/index.html, .env, requirements.txt

