import os
import io
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient
from dotenv import load_dotenv
import logging

# Configure logging to help with debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1) Load your service URLs from environment (set these in your .env)
load_dotenv()
STT_URL = os.getenv("STT_URL", "http://stt:8001")            # your Whisper STT service
LLM_URL = os.getenv("LLM_URL", "http://llm-core:8002")      # your GPT-4 / GPT-3.5-turbo service
TTS_URL = os.getenv("TTS_URL", "http://tts:8003")           # your Veena TTS service
# Default speaker hardcoded per request
TTS_DEFAULT_SPEAKER = "vinaya_assist"

# 2) FastAPI app and shared HTTP client
app = FastAPI(title="Audio Therapy Orchestrator")

# Allow the marketing site to call the API from known local origins by default
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080"
    ).split(",") if o.strip()
]
ALLOW_CREDENTIALS = os.getenv("ALLOW_CREDENTIALS", "0").strip() == "1"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=None,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = AsyncClient()
sessions: dict[str, list[dict]] = {}

# Minimal text chat proxy for the client UI text box
@app.post("/chat-proxy")
async def chat_proxy(payload: dict):
    try:
        llm_resp = await client.post(f"{LLM_URL}/chat", json=payload, timeout=60.0)
        llm_resp.raise_for_status()
        return JSONResponse(llm_resp.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"chat proxy failed: {e}")

@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "services": {
        "stt": STT_URL,
        "llm": LLM_URL, 
        "tts": TTS_URL
    }})

@app.get("/gpu-status")
async def gpu_status():
    """Get GPU status from all services that support it"""
    gpu_status = {}
    
    try:
        # Check TTS service GPU status
        tts_resp = await client.get(f"{TTS_URL}/health", timeout=10.0)
        if tts_resp.status_code == 200:
            tts_data = tts_resp.json()
            gpu_status["tts"] = tts_data.get("gpu", {})
        else:
            gpu_status["tts"] = {"error": f"HTTP {tts_resp.status_code}"}
    except Exception as e:
        gpu_status["tts"] = {"error": str(e)}
    
    return JSONResponse({
        "gpu_status": gpu_status,
        "timestamp": "now"
    })

@app.post("/session/{session_id}/speak")
async def speak(session_id: str, audio: UploadFile = File(...)):
    """
    1) Receive raw audio
    2) Transcribe via STT service
    3) Send transcript + history to LLM service
    4) Synthesize LLM reply via TTS service
    5) Stream back resulting WAV
    """
    try:
        logger.info(f"Processing request for session: {session_id}")
        
        # --- 1. Read inbound audio bytes ---
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio provided.")
        
        logger.info(f"Audio received: {len(audio_bytes)} bytes")

        # --- 2. Whisper STT - Send as multipart form data with correct type ---
        # If the incoming file is from MediaRecorder it will likely be webm/opus.
        inferred_name = audio.filename or "audio.webm"
        inferred_ct = audio.content_type or ("audio/webm" if inferred_name.endswith(".webm") else "audio/mpeg")
        files = {"audio": (inferred_name, audio_bytes, inferred_ct)}
        stt_resp = await client.post(f"{STT_URL}/transcribe", files=files, timeout=60.0)
        stt_resp.raise_for_status()
        transcript = stt_resp.json().get("text", "")
        logger.info(f"Transcription: {transcript[:50]}...")

        # --- 3. Maintain session history for context ---
        history = sessions.setdefault(session_id, [])
        history.append({"role": "user", "content": transcript})
        
        # Keep only last 20 exchanges to prevent token overflow
        if len(history) > 20:
            history = history[-20:]
            sessions[session_id] = history

        # --- 4. LLM Core (GPT-4 / GPT-3.5-turbo) ---
        llm_payload = {"history": history}
        llm_resp = await client.post(f"{LLM_URL}/chat", json=llm_payload, timeout=60.0)
        llm_resp.raise_for_status()
        reply = llm_resp.json().get("reply", "")
        history.append({"role": "assistant", "content": reply})
        logger.info(f"LLM reply: {reply[:50]}...")

        # --- 5. Veena TTS ---
        tts_payload = {"text": reply, "speaker": TTS_DEFAULT_SPEAKER}
        tts_resp = await client.post(
            f"{TTS_URL}/synthesize",
            json=tts_payload,
            timeout=300.0  # TTS can take longer
        )
        tts_resp.raise_for_status()
        wav_bytes = tts_resp.content
        
        logger.info("Successfully processed complete pipeline")

        # --- 6. Stream back the synthesized audio ---
        return StreamingResponse(io.BytesIO(wav_bytes), media_type="audio/wav")
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

# Optional: Add session management endpoints
@app.get("/session/{session_id}/history")
async def get_history(session_id: str):
    """Get conversation history for a session"""
    return JSONResponse({"history": sessions.get(session_id, [])})

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a session's history"""
    if session_id in sessions:
        del sessions[session_id]
    return JSONResponse({"status": "cleared"})

# ──────────────────────────────────────────────────────────────────────────────
# New endpoints to support the website UI: separate STT, LLM+TTS, and text chat
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/session/{session_id}/transcribe")
async def transcribe_only(session_id: str, audio: UploadFile = File(...)):
    """Transcribe audio and return text without mutating history."""
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio provided.")
        inferred_name = audio.filename or "audio.webm"
        inferred_ct = audio.content_type or ("audio/webm" if inferred_name.endswith(".webm") else "audio/mpeg")
        files = {"audio": (inferred_name, audio_bytes, inferred_ct)}
        stt_resp = await client.post(f"{STT_URL}/transcribe", files=files, timeout=60.0)
        stt_resp.raise_for_status()
        text = stt_resp.json().get("text", "")
        return JSONResponse({"text": text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"transcription failed: {e}")


async def _reply_and_tts(session_id: str, user_text: str) -> dict:
    """Helper: update history, get LLM reply, synthesize audio, return both."""
    # Update history
    history = sessions.setdefault(session_id, [])
    history.append({"role": "user", "content": user_text})
    if len(history) > 20:
        sessions[session_id] = history[-20:]
        history = sessions[session_id]

    # LLM
    llm_payload = {"history": history}
    llm_resp = await client.post(f"{LLM_URL}/chat", json=llm_payload, timeout=60.0)
    llm_resp.raise_for_status()
    reply_text = llm_resp.json().get("reply", "")
    history.append({"role": "assistant", "content": reply_text})

    # TTS
    tts_payload = {"text": reply_text, "speaker": TTS_DEFAULT_SPEAKER}
    tts_resp = await client.post(
        f"{TTS_URL}/synthesize",
        json=tts_payload,
        timeout=300.0,
    )
    tts_resp.raise_for_status()
    wav_bytes = tts_resp.content
    wav_b64 = base64.b64encode(wav_bytes).decode("ascii")
    return {"reply_text": reply_text, "wav_b64": wav_b64}


@app.post("/session/{session_id}/reply")
async def reply_from_text(session_id: str, payload: dict):
    """Given user text, return assistant text and audio (base64 WAV)."""
    try:
        user_text = (payload or {}).get("text", "").strip()
        if not user_text:
            raise HTTPException(status_code=400, detail="text is required")
        result = await _reply_and_tts(session_id, user_text)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"reply failed: {e}")


@app.post("/session/{session_id}/text")
async def text_message(session_id: str, payload: dict):
    """Alias for /reply for typed messages."""
    return await reply_from_text(session_id, payload)

 