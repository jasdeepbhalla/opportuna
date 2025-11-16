from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Profile(BaseModel):
    fullName: str = Field("", description="User's full name")
    title: str = ""
    affiliation: str = ""
    shortBio: str = ""
    keywords: str = ""
    email: str = ""
    backendUrl: Optional[str] = ""  # not used server-side


class Chair(BaseModel):
    name: str
    email: str
    role: str = "chair"


class Conference(BaseModel):
    url: str
    title: str
    dates: Optional[List[str]] = None
    location: Optional[str] = None
    chairs: Optional[List[Chair]] = None
    pageSummary: Optional[str] = None


class GenerateEmailRequest(BaseModel):
    profile: Dict[str, Any]
    conference: Conference
    opportunity_type: str = "reviewer"
    tone: str = "professional"
    custom_notes: Optional[str] = ""


class GenerateEmailResponse(BaseModel):
    subject: str
    body: str
