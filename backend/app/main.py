from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
from .llm_client import call_llm
from .parsers import parse_to_schema
from .schemas import DrawingResponse
from dotenv import load_dotenv
import os
from pathlib import Path

# FORCE the .env path inside backend folder
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
ENV_PATH = BASE_DIR / ".env"

print("Using .env file at:", ENV_PATH)

load_dotenv(dotenv_path=ENV_PATH)

print("Loaded PROVIDER =", os.getenv("LLM_PROVIDER"))
print("Groq KEY =", os.getenv("GROQ_API_KEY"))


app = FastAPI(title="Miran World - Drawing JSON API")

# -------------------------
# CORS MIDDLEWARE
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserQuery(BaseModel):
    query: str

@app.post("/userquery", response_model=DrawingResponse)
async def user_query(payload: UserQuery):
    user_input = payload.query
    try:
        raw = call_llm(user_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM call failed: {e}")

    try:
        # ✅ FIXED: pass user_input for unit detection + dimensions
        drawing = parse_to_schema(raw, user_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM output: {e}")

    return drawing

@app.get("/health")
def health():
    return {"status": "ok"}
