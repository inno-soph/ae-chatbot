# FAQ Chatbot

A lightweight FAQ chatbot with a browser-based UI, remote RAG (retrieval-augmented generation) integration, and local feedback collection.

Answers are sourced from AE-approved FAQ content via a RAG backend. Users can ask questions, adjust how many answers to retrieve, and rate responses with thumbs up/down and optional comments.

## Project structure

```
chatbot/
├── index.html          # Chat UI
├── chatbot.js          # Frontend logic, API calls, feedback UI
├── styles.css          # Layout and styling
├── app.py              # Local FastAPI server (feedback + optional RAG proxy)
├── call_back.py        # RAG client used by app.py
├── logo.png            # Header logo (referenced by index.html)
└── feedback_store.jsonl # Feedback log (created on first submission)
```

## Architecture

```
Browser (index.html + chatbot.js)
    │
    ├── Chat queries ──► Remote RAG API (CONFIG.API_URL)
    │
    └── Feedback ──────► Local FastAPI (CONFIG.FEEDBACK_API_URL)
                              └── feedback_store.jsonl
```

By default, the frontend talks **directly** to a remote RAG server for chat answers. The local FastAPI app (`app.py`) is used to **persist user feedback** on your machine.

`app.py` also exposes a `/api/rag/query` endpoint that proxies requests through `call_back.py`. That path is optional and is not used by the default frontend configuration.

## Prerequisites

- A modern web browser
- Python 3.11+ (for the local feedback API)
- Network access to the configured RAG server

## Setup

### 1. Install Python dependencies

```bash
pip install fastapi uvicorn pydantic requests
```

### 2. Configure endpoints (optional)

Edit the `CONFIG` object at the top of `chatbot.js`:

| Setting | Default | Purpose |
|---------|---------|---------|
| `USE_MOCK_BACKEND` | `false` | Set to `true` for UI testing without any backend |
| `API_URL` | `http://20.168.112.204:8000/rag/query` | RAG endpoint for chat answers |
| `FEEDBACK_API_URL` | `http://127.0.0.1:8000/api/feedback` | Local feedback endpoint |
| `API_LANG` | `en` | Language code sent with requests |

If you route chat through the local FastAPI proxy instead, point `API_URL` at `http://127.0.0.1:8000/api/rag/query` and update `BACKEND_RAG_URL` in `call_back.py` to your upstream RAG service.

## Running the app

### Chat only (no local server)

Open `index.html` in a browser (or serve the folder with any static file server). Chat works as long as the remote RAG server is reachable.

```bash
# Example: simple local static server
python -m http.server 5500
```

Then open `http://localhost:5500`.

### Chat + feedback

Start the local FastAPI server so feedback can be saved:

```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Then open the frontend as above. Thumbs up/down submissions are appended to `feedback_store.jsonl`.

### Mock mode (UI development)

Set `USE_MOCK_BACKEND: true` in `chatbot.js`. The UI returns canned responses and skips the feedback API—no backend required.

## Features

- **Example questions** — Click a suggested prompt to start a conversation
- **Answer count slider** — Retrieve 1–10 answers per query (`num_results`)
- **Response feedback** — Rate each bot reply; optional comment up to 500 characters
- **Auto-scroll** — Chat history scrolls to new messages unless the user scrolls up

## Feedback storage

Feedback is saved as **JSON Lines** in `feedback_store.jsonl` (one JSON object per line):

```json
{
  "timestamp": "2026-06-18T12:34:56.789012+00:00",
  "rating": "up",
  "comment": "Helpful answer",
  "question": "What are the main GaN applications?",
  "response": "...",
  "lang": "en"
}
```

View aggregate counts:

```bash
curl http://127.0.0.1:8000/api/feedback/stats
```

Example response:

```json
{
  "total": 12,
  "thumbs_up": 9,
  "thumbs_down": 3,
  "with_comment": 4
}
```

## API reference (local FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rag/query` | Proxy a question to the RAG backend |
| `POST` | `/api/feedback` | Save thumbs up/down and optional comment |
| `GET` | `/api/feedback/stats` | Return feedback totals |

### POST `/api/feedback`

Request body:

```json
{
  "rating": "up",
  "comment": "Optional text",
  "question": "User question",
  "response": "Bot response",
  "lang": "en"
}
```

Response: `{ "status": "ok" }`

## Troubleshooting

| Issue | Likely cause |
|-------|----------------|
| Chat returns an error | Remote RAG server unreachable or `API_URL` misconfigured |
| "Could not save feedback" | Local `app.py` not running on port 8000 |
| CORS errors when opening `index.html` as a file | Serve the folder over HTTP instead of `file://` |
| Empty or missing logo | Add `logo.png` to the project root |

## License

Add your license here if applicable.
