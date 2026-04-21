import os
import threading
from collections import deque
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

SYSTEM_PROMPT = """You are an Agile meeting moderator assistant. Given a transcript excerpt,
identify action items, blockers, decisions, and meeting notes. Be concise and structured.
Format your response as JSON with keys: action_items, blockers, decisions, notes."""


class Moderator:
    def __init__(self, on_moderation):
        self.on_moderation = on_moderation
        self._buffer = deque(maxlen=50)
        self._lock = threading.Lock()
        self._timer = None

    def add_transcript(self, text: str, speaker: str):
        with self._lock:
            self._buffer.append(f"{speaker}: {text}")
        self._schedule_analysis()

    def _schedule_analysis(self):
        if self._timer:
            self._timer.cancel()
        self._timer = threading.Timer(5.0, self._analyze)
        self._timer.daemon = True
        self._timer.start()

    def _analyze(self):
        with self._lock:
            if not self._buffer:
                return
            transcript_chunk = "\n".join(self._buffer)

        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": transcript_chunk},
                ],
                response_format={"type": "json_object"},
                max_tokens=500,
            )
            result = resp.choices[0].message.content
            self.on_moderation(result)
        except Exception as e:
            self.on_moderation(f'{{"error": "{e}"}}')

    def get_summary(self):
        with self._lock:
            transcript_chunk = "\n".join(self._buffer)
        if not transcript_chunk:
            return '{"summary": "No transcript yet."}'
        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Summarize this Agile meeting transcript concisely as JSON with key 'summary'."},
                    {"role": "user", "content": transcript_chunk},
                ],
                response_format={"type": "json_object"},
                max_tokens=300,
            )
            return resp.choices[0].message.content
        except Exception as e:
            return f'{{"error": "{e}"}}'
