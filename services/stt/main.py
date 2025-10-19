from fastapi import FastAPI, File, UploadFile, HTTPException
from openai import AzureOpenAI
from dotenv import load_dotenv
import os
import io
import logging
import traceback

load_dotenv()

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "stt"}

# Configure Azure OpenAI
WHISPER_KEY = os.getenv("AZURE_OPENAI_WHISPER_KEY")
WHISPER_ENDPOINT = os.getenv("AZURE_OPENAI_WHISPER_ENDPOINT")
WHISPER_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
WHISPER_DEPLOYMENT = os.getenv("AZURE_OPENAI_WHISPER_DEPLOYMENT")

# Normalization removed per user requirement; use endpoint as provided in .env

if not all([WHISPER_KEY, WHISPER_ENDPOINT, WHISPER_API_VERSION, WHISPER_DEPLOYMENT]):
    raise RuntimeError("Missing one or more required Whisper environment variables (AZURE_OPENAI_WHISPER_KEY, AZURE_OPENAI_WHISPER_ENDPOINT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_WHISPER_DEPLOYMENT)!")

client = AzureOpenAI(
    api_key=WHISPER_KEY,
    azure_endpoint=WHISPER_ENDPOINT,
    api_version=WHISPER_API_VERSION
)

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        # Read the audio file content
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio payload")
        
        # Create a temporary file-like object for OpenAI
        audio_file = io.BytesIO(audio_bytes)
        # Preserve original filename/extension if provided, fallback to mp3
        original_name = (audio.filename or "audio.mp3").strip()
        if "." not in original_name:
            original_name += ".mp3"
        audio_file.name = original_name  # OpenAI needs a filename with extension
        
        # Call Azure OpenAI Whisper
        transcript = client.audio.transcriptions.create(
            model=WHISPER_DEPLOYMENT,
            file=audio_file
        )
        
        return {"text": transcript.text}
        
    except Exception as e:
        logger.error(f"STT transcription error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
