import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AzureOpenAI

# ─── Load environment variables from .env ─────
load_dotenv()

# Get Azure OpenAI config from environment variables (fallback to GPT4 names if not set)
AZURE_OPENAI_GPT5_KEY = os.getenv("AZURE_OPENAI_GPT5_KEY") or os.getenv("AZURE_OPENAI_GPT4_KEY")
AZURE_OPENAI_GPT5_ENDPOINT = os.getenv("AZURE_OPENAI_GPT5_ENDPOINT") or os.getenv("AZURE_OPENAI_GPT4_ENDPOINT")
AZURE_OPENAI_GPT5_DEPLOYMENT = os.getenv("AZURE_OPENAI_GPT5_DEPLOYMENT") or os.getenv("AZURE_OPENAI_GPT4_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
THERAPIST_SYSTEM_PROMPT = os.getenv("THERAPIST_SYSTEM_PROMPT", "").strip()

# Normalization removed per user requirement; use endpoint as provided in .env

# Defensive checks (optional, but helpful for debugging)
if not AZURE_OPENAI_GPT5_KEY:
    raise RuntimeError("Environment variable AZURE_OPENAI_GPT5_KEY is missing!")
if not AZURE_OPENAI_GPT5_ENDPOINT:
    raise RuntimeError("Environment variable AZURE_OPENAI_GPT5_ENDPOINT is missing!")
if not AZURE_OPENAI_GPT5_DEPLOYMENT:
    raise RuntimeError("Environment variable AZURE_OPENAI_GPT5_DEPLOYMENT is missing!")

# Initialize the Azure OpenAI client
client = AzureOpenAI(
    api_key= AZURE_OPENAI_GPT5_KEY,
    azure_endpoint=AZURE_OPENAI_GPT5_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION
)

app = FastAPI(title="LLM Core Service")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "llm-core"}

class ChatRequest(BaseModel):
    history: list[dict]  # [{"role":"user","content":"..."}, ...]

@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.history:
        raise HTTPException(status_code=400, detail="History cannot be empty.")

    # Prepend the therapist system prompt if present
    messages = []
    if THERAPIST_SYSTEM_PROMPT:
        messages.append({"role": "system", "content": THERAPIST_SYSTEM_PROMPT})
    messages.extend(req.history)

    # Make request to Azure OpenAI endpoint
    try:
        resp = client.chat.completions.create(
            model=AZURE_OPENAI_GPT5_DEPLOYMENT,  # deployment name for Azure
            messages=messages
        )
        reply = resp.choices[0].message.content
    except Exception as e:
        # Log details and propagate as HTTP error
        raise HTTPException(status_code=500, detail=f"Azure OpenAI call failed: {e}")

    return {"reply": reply}
