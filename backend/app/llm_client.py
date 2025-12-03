import os
import json
import requests

# Load provider from environment
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock").lower()


# ---------------------------------------------------------
# BUILD PREMIUM JSON GENERATION PROMPT
# ---------------------------------------------------------
def build_prompt(user_query: str) -> str:
    return f"""
You must output ONLY valid JSON. No explanations. No extra text.
The JSON should describe geometric shapes.

USER REQUEST:
{user_query!r}

Valid shape formats:

1) Triangle:
   {{ "type": "triangle",
     "points": [[x1,y1], [x2,y2], [x3,y3]] }}

2) Circle:
   {{ "type": "circle",
     "center":[cx,cy], "radius": r }}

3) Rectangle:
   {{ "type": "rectangle",
     "x":X, "y":Y, "width":W, "height":H }}

4) Line:
   {{ "type": "line",
     "points":[[x1,y1],[x2,y2]] }}

5) Ellipse:
   {{ "type": "ellipse",
     "center":[cx,cy], "rx": RX, "ry": RY }}

6) Polygon:
   {{ "type": "polygon",
     "points":[[x1,y1],...,[xn,yn]] }}

RULES:
- Use only numbers.
- Coordinates must lie between 0–500.
- Shapes should be concise and approximate if needed.
- Output MUST be valid JSON.
- Final required structure:

{{
  "shapes": [...],
  "meta": {{
    "units": "user-space"
  }}
}}
"""


# ---------------------------------------------------------
# MOCK FOR LOCAL DEVELOPMENT
# ---------------------------------------------------------
def _mock_response(_query: str) -> str:
    return json.dumps({
        "shapes": [
            {"type": "triangle", "points": [[0, 100], [0, 0], [100, 0]]},
            {"type": "circle", "center": [29.2895, 29.2895], "radius": 29.2895}
        ],
        "meta": {"units": "user-space", "note": "mock incircle"}
    })


# ---------------------------------------------------------
# OPENAI CLIENT (OPTIONAL)
# ---------------------------------------------------------
def _call_openai(prompt: str) -> str:
    import openai
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")

    openai.api_key = key
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    resp = openai.ChatCompletion.create(
        model=model,
        messages=[
            {"role": "system", "content": "Respond ONLY in JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0
    )
    return resp["choices"][0]["message"]["content"]


# ---------------------------------------------------------
# 🚀 GROQ CLIENT — CORRECT 2025 ENDPOINT (openai-compatible)
# ---------------------------------------------------------
def _call_groq(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing")

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Respond ONLY with valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0,
        "max_tokens": 800
    }

    response = requests.post(url, headers=headers, json=payload, timeout=40)

    if response.status_code != 200:
        raise RuntimeError(f"GROQ ERROR {response.status_code}: {response.text}")

    data = response.json()

    # Raw output
    content = data["choices"][0]["message"]["content"]

    # ----------------------------
    # Ensure result is valid JSON
    # ----------------------------
    cleaned = safe_json_extract(content)
    return cleaned


# ---------------------------------------------------------
# JSON SAFETY FIXER — in case LLM returns trailing content
# ---------------------------------------------------------
def safe_json_extract(text: str) -> str:
    """
    Attempts to extract pure JSON from the LLM output.
    Fixes:
    - missing closing brackets
    - stray markdown (```json)
    - extra commentary
    """

    # Remove code fences
    text = text.replace("```json", "").replace("```", "").strip()

    # Try direct parse
    try:
        json.loads(text)
        return text
    except:
        pass

    # Attempt bracket extraction
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        candidate = text[start:end]
        json.loads(candidate)
        return candidate
    except:
        raise RuntimeError("LLM returned malformed JSON:\n" + text)


# ---------------------------------------------------------
# PUBLIC ENTRY POINT
# ---------------------------------------------------------
def call_llm(user_query: str) -> str:
    provider = os.getenv("LLM_PROVIDER", "mock").lower()

    prompt = build_prompt(user_query)

    if provider == "mock":
        return _mock_response(user_query)

    if provider == "groq":
        return _call_groq(prompt)

    if provider == "openai":
        return _call_openai(prompt)

    raise RuntimeError(f"Invalid LLM_PROVIDER={provider}")

