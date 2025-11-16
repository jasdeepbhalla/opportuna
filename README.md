# Opportuna  
### AI-Powered Opportunity Outreach Assistant (Chrome Extension + Python Backend)

Opportuna is an AI-driven tool that helps professionals discover and act on opportunities such as:

- Conference program committee reviewing  
- Journal peer reviewing  
- Hackathon and competition judging  
- Speaking & panelist invitations  
- Proposal and submission reviewing  
- Other academic or industry service roles  

From any **conference / CFP / journal / workshop / hackathon** webpage, Opportuna can:

1. **Read the page**, extract chairs, emails, locations, dates, and relevant context.  
2. Combine that with your saved **profile** (name, expertise, bio, keywords).  
3. Send the information to the **Python backend** using the OpenAI API.  
4. Generate a **personalized cold-outreach email** tailored to the event.  
5. Let you edit it, copy it, or **open a Gmail draft** with subject/body prefilled.  

You stay in full control.  
Opportuna **never auto-sends** email on your behalf.

---

## ✨ Features

### 🔎 Smart Page Understanding
- Reads headings, chairs, mailto links, and contextual clues.
- Detects dates, venues, committees, and track names.
- Summarizes long CFP pages automatically.

### 🧠 AI Email Generation
- Uses your saved profile + extracted page details.
- Generates a polished, professional outreach email.
- Supports different tones (formal, professional, friendly).
- Supports different opportunity types (reviewer, judge, speaker, etc).

### 📧 Easy Delivery
- Copy subject/body with one click.
- Or open **Gmail compose** with fields pre-filled.
- Never sends email automatically (safe & non-spammy).

### 🛡 Secure & Local
- Your profile is stored locally via Chrome Storage.
- The Python backend holds your OpenAI key safely in `.env`.
