from __future__ import annotations

import logging
import os
import tempfile
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from api_services import (
        analyze_image_with_query,
        generate_text_response,
        synthesize_speech_to_file,
        transcribe_audio_with_whisper,
    )
except ImportError:
    from .api_services import (
        analyze_image_with_query,
        generate_text_response,
        synthesize_speech_to_file,
        transcribe_audio_with_whisper,
    )

logger = logging.getLogger("medigenie.api")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

APP_TITLE = "MediGenie Production API"
APP_VERSION = "2.0.0"
BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "generated_audio"
AUDIO_DIR.mkdir(exist_ok=True)

TEXT_MODEL = os.getenv("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile")
VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "whisper-large-v3")

TEXT_SYSTEM_PROMPT = (
    "You are a careful medical AI assistant for educational use. Respond in plain text, keep the answer concise, "
    "mention uncertainty when needed, avoid markdown, and do not claim a diagnosis with certainty."
)

IMAGE_SYSTEM_PROMPT = (
    "You are reviewing a medical image for educational support. Answer in plain text, describe the likely findings, "
    "mention uncertainty, and suggest follow-up or escalation when appropriate."
)

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

app = FastAPI(title=APP_TITLE, version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000, description="Patient message")


class ChatResponse(BaseModel):
    success: bool = True
    input_text: str
    response: str
    audio_url: str
    model: str


class VoiceResponse(BaseModel):
    success: bool = True
    transcription: str
    response: str
    audio_url: str
    stt_model: str
    llm_model: str


class ImageResponse(BaseModel):
    success: bool = True
    query: str
    diagnosis: str
    model: str


def require_groq_api_key() -> str:
    load_dotenv(BASE_DIR / ".env", override=True)
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Missing required environment variable: GROQ_API_KEY")
    return groq_api_key


def normalize_text(value: str | None, field_name: str) -> str:
    text = (value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail=f"{field_name} is required.")
    return text


async def save_upload_to_temp(upload: UploadFile, allowed_types: set[str], default_suffix: str) -> Path:
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type not in allowed_types:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {upload.content_type}")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file is too large.")

    suffix = Path(upload.filename or "").suffix or default_suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        return Path(temp_file.name)


def create_audio_url(request: Request, response_text: str) -> str:
    filename = f"{uuid.uuid4().hex}.mp3"
    output_path = AUDIO_DIR / filename
    synthesize_speech_to_file(response_text, str(output_path))
    return str(request.url_for("audio", path=filename))


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": "Validation failed.", "details": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error", exc_info=exc)
    return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error."})


@app.get("/health")
async def health_check() -> dict[str, str | bool]:
    load_dotenv(BASE_DIR / ".env", override=True)
    return {"success": True, "status": "ok", "groq_configured": bool(os.getenv("GROQ_API_KEY"))}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request) -> ChatResponse:
    text = normalize_text(request.text, "text")
    response_text = generate_text_response(text, TEXT_SYSTEM_PROMPT, TEXT_MODEL, require_groq_api_key())
    if not response_text:
        raise HTTPException(status_code=502, detail="LLM returned an empty response.")

    return ChatResponse(
        input_text=text,
        response=response_text,
        audio_url=create_audio_url(http_request, response_text),
        model=TEXT_MODEL,
    )


@app.post("/voice", response_model=VoiceResponse)
async def voice(http_request: Request, audio: UploadFile = File(...)) -> VoiceResponse:
    temp_audio_path = await save_upload_to_temp(audio, ALLOWED_AUDIO_TYPES, ".wav")
    try:
        transcription = transcribe_audio_with_whisper(
            str(temp_audio_path), WHISPER_MODEL, require_groq_api_key()
        )
        if not transcription:
            raise HTTPException(status_code=502, detail="Speech-to-text returned an empty transcription.")

        response_text = generate_text_response(
            transcription, TEXT_SYSTEM_PROMPT, TEXT_MODEL, require_groq_api_key()
        )
        if not response_text:
            raise HTTPException(status_code=502, detail="LLM returned an empty response.")

        return VoiceResponse(
            transcription=transcription,
            response=response_text,
            audio_url=create_audio_url(http_request, response_text),
            stt_model=WHISPER_MODEL,
            llm_model=TEXT_MODEL,
        )
    finally:
        temp_audio_path.unlink(missing_ok=True)


@app.post("/image", response_model=ImageResponse)
async def image(
    image: UploadFile = File(...),
    query: str = Form(default="Please review this medical image and share your assessment."),
) -> ImageResponse:
    normalized_query = normalize_text(query, "query")
    temp_image_path = await save_upload_to_temp(image, ALLOWED_IMAGE_TYPES, ".jpg")
    try:
        diagnosis = analyze_image_with_query(
            f"{IMAGE_SYSTEM_PROMPT}\n\nUser question: {normalized_query}",
            str(temp_image_path),
            VISION_MODEL,
            require_groq_api_key(),
        )
        if not diagnosis:
            raise HTTPException(status_code=502, detail="Vision model returned an empty response.")

        return ImageResponse(query=normalized_query, diagnosis=diagnosis, model=VISION_MODEL)
    finally:
        temp_image_path.unlink(missing_ok=True)
