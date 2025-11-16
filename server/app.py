import os
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

from models import GenerateEmailRequest, GenerateEmailResponse, Profile

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
  raise RuntimeError("OPENAI_API_KEY not set in environment/.env")

MODEL_NAME = os.getenv("OPPORTUNA_DEFAULT_MODEL", "gpt-4.1-mini")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="Opportuna Backend", version="0.1.0")

# CORS so your extension can call localhost directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this later if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_system_prompt(opportunity_type: str, tone: str) -> str:
    base = (
        "You are Opportuna, an assistant that drafts high-quality cold outreach emails "
        "for professional opportunities (program committee reviewer, journal reviewer, judge, speaker, etc.). "
        "You write concise, respectful emails tailored to conferences and journals, avoiding hype and spammy language. "
    )

    if tone == "friendly":
        base += "Use a friendly, warm but still professional tone.\n"
    elif tone == "formal":
        base += "Use a formal academic tone.\n"
    else:
        base += "Use a neutral, professional tone.\n"

    base += (
        "Always output a JSON object with exactly two fields: `subject` and `body`. "
        "The body should be a plain text email with greeting, 2–4 short paragraphs, and a polite closing.\n"
    )

    base += f"The opportunity type is: {opportunity_type}.\n"
    return base


def build_user_prompt(req: GenerateEmailRequest) -> str:
    profile = Profile(**req.profile)

    conf = req.conference

    chair_lines: List[str] = []
    if conf.chairs:
        for c in conf.chairs:
            chair_lines.append(f"- {c.name} <{c.email}> ({c.role})")

    prompt_parts = [
        "Use the following information to draft the email.\n",
        "=== SENDER PROFILE ===",
        f"Name: {profile.fullName}",
        f"Title: {profile.title}",
        f"Affiliation: {profile.affiliation}",
        f"Short bio: {profile.shortBio}",
        f"Expertise keywords: {profile.keywords}",
        f"Sender email: {profile.email}",
        "",
        "=== CONFERENCE / VENUE INFO ===",
        f"Title: {conf.title}",
        f"URL: {conf.url}",
        f"Location: {conf.location or 'Unknown'}",
        f"Dates: {', '.join(conf.dates or []) or 'Unknown'}",
        "",
    ]

    if chair_lines:
        prompt_parts.append("Detected chairs / contacts:")
        prompt_parts.extend(chair_lines)
        prompt_parts.append("")

    if conf.pageSummary:
        prompt_parts.append("=== PAGE SUMMARY (raw text snippet) ===")
        prompt_parts.append(conf.pageSummary[:4000])
        prompt_parts.append("")

    prompt_parts.append("=== OPPORTUNITY TYPE ===")
    prompt_parts.append(req.opportunity_type)
    prompt_parts.append("")

    if req.custom_notes:
        prompt_parts.append("=== SPECIAL EMPHASIS / CUSTOM NOTES FROM SENDER ===")
        prompt_parts.append(req.custom_notes)
        prompt_parts.append("")

    prompt_parts.append(
        "Please: "
        "1) Address the chairs or organizing committee appropriately (use names if provided, otherwise generic). "
        "2) Briefly highlight the sender's relevant experience. "
        "3) Explicitly express interest in the opportunity type above. "
        "4) Keep the email within ~200–300 words. "
        "5) Do not invent achievements that are not obviously implied by the profile."
    )

    return "\n".join(prompt_parts)


@app.post("/api/generate-email", response_model=GenerateEmailResponse)
def generate_email(req: GenerateEmailRequest):
    system_prompt = build_system_prompt(req.opportunity_type, req.tone)
    user_prompt = build_user_prompt(req)

    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    content = completion.choices[0].message.content
    # content should already be a JSON string because of response_format
    import json

    try:
        parsed = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JSON from model: {e}")

    subject = parsed.get("subject", "").strip()
    body = parsed.get("body", "").strip()

    if not subject or not body:
        raise HTTPException(status_code=500, detail="Model did not return subject/body.")

    # Optionally ensure we include sender email in signature if missing
    profile = Profile(**req.profile)
    if profile.email and profile.email not in body:
        body += f"\n\n{profile.fullName}\n{profile.title}\n{profile.affiliation}\n{profile.email}"

    return GenerateEmailResponse(subject=subject, body=body)


@app.get("/health")
def health():
    return {"status": "ok"}
