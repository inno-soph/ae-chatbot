from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from threading import Lock
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from call_back import call_backend

app = FastAPI(title="Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

feedback_file = Path(__file__).with_name("feedback_store.jsonl")
file_lock = Lock()


class RagQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    lang: str = Field(default="en", min_length=2, max_length=5)
    num_results: int = Field(default=1, ge=1, le=10)
    score_threshold: float | None = None


class FeedbackRequest(BaseModel):
    rating: Literal["up", "down"]
    comment: str = Field(default="", max_length=500)
    question: str = Field(default="", max_length=1000)
    response: str = Field(default="", max_length=10000)
    lang: str = Field(default="en", min_length=2, max_length=5)


@app.post("/api/rag/query")
def rag_query(payload: RagQueryRequest):
    result = call_backend(
        question=payload.question,
        lang_code=payload.lang,
        num_answers=payload.num_results,
    )

    if isinstance(result, str) and result.startswith("⚠️"):
        raise HTTPException(status_code=502, detail=result)

    return {"result": result}


@app.post("/api/feedback")
def save_feedback(payload: FeedbackRequest):
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "rating": payload.rating,
        "comment": payload.comment.strip(),
        "question": payload.question.strip(),
        "response": payload.response.strip(),
        "lang": payload.lang,
    }

    try:
        with file_lock:
            with feedback_file.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=True) + "\n")
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to store feedback") from exc

    return {"status": "ok"}


@app.get("/api/feedback/stats")
def feedback_stats():
    if not feedback_file.exists():
        return {"total": 0, "thumbs_up": 0, "thumbs_down": 0, "with_comment": 0}

    total = 0
    thumbs_up = 0
    thumbs_down = 0
    with_comment = 0

    try:
        with feedback_file.open("r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line:
                    continue
                total += 1

                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if entry.get("rating") == "up":
                    thumbs_up += 1
                elif entry.get("rating") == "down":
                    thumbs_down += 1

                if entry.get("comment"):
                    with_comment += 1
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to read feedback stats") from exc

    return {
        "total": total,
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "with_comment": with_comment,
    }
