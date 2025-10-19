import os
import io
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv


# Load environment
load_dotenv()
MAYA_API_KEY = (os.getenv("MAYA_API_KEY") or "").strip()
MAYA_API_URL = (os.getenv("MAYA_API_URL") or "").strip()


app = FastAPI(title="Veena TTS Proxy")


@app.get("/health")
async def health():
    return JSONResponse({
        "status": "ok",
        "provider": "maya-veena",
        "api_url_configured": bool(MAYA_API_URL),
    })


class TTSRequest(BaseModel):
    text: str
    speaker: Optional[str] = None  # if the API supports voices
    speed: Optional[float] = None
    remove_silence: Optional[bool] = None
    cross_fade_duration: Optional[float] = None
    force_hindi_transcription: Optional[bool] = None


def _build_payload(req: TTSRequest) -> dict:
    payload = {"text": req.text}
    if req.speaker is not None:
        payload["speaker"] = req.speaker
    if req.speed is not None:
        payload["speed"] = req.speed
    if req.remove_silence is not None:
        payload["remove_silence"] = req.remove_silence
    if req.cross_fade_duration is not None:
        payload["cross_fade_duration"] = req.cross_fade_duration
    if req.force_hindi_transcription is not None:
        payload["force_hindi_transcription"] = req.force_hindi_transcription
    return payload


@app.post("/synthesize")
async def synthesize(req: TTSRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required.")
    if not MAYA_API_URL or not MAYA_API_KEY:
        raise HTTPException(status_code=500, detail="Maya API not configured. Set MAYA_API_URL and MAYA_API_KEY.")

    headers = {
        "Authorization": f"Bearer {MAYA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "audio/wav",
    }
    payload = _build_payload(req)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(MAYA_API_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                detail = resp.text
                try:
                    j = resp.json()
                    detail = j.get("detail") or j.get("error") or detail
                except Exception:
                    pass
                raise HTTPException(status_code=resp.status_code, detail=f"Maya API error: {detail}")

            wav_bytes = resp.content
            return StreamingResponse(io.BytesIO(wav_bytes), media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS proxy failed: {e}")


