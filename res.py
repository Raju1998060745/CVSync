from google import genai
from google.genai import types
import base64
import sqlite3
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, Depends, HTTPException, status
import os
from pydantic import BaseModel
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
from langsmith import traceable
from fastapi.middleware.cors import CORSMiddleware 
import re
from typing import List, Optional, Dict
import json
from jose import JWTError, jwt
from passlib.context import CryptContext

from dotenv import load_dotenv
from pdf_utils import generate_pdf_from_content

load_dotenv()


TARGET_SCORE   = 90          # stop when ATS score ≥ this value
MAX_ROUNDS     = 3 
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # or ["*"] for all
    allow_credentials=True,
    allow_methods=["*"],         # lets pre-flight ask for any verb
    allow_headers=["*"],
)

class Contact(BaseModel):
    phone: str
    email: str
    linkedin: str


class Profile(BaseModel):
    summary: str
    skills: Dict[str, List[str]]
    core_competencies: List[str]


class ExperienceEntry(BaseModel):
    company: str
    title: str
    location: Optional[str]
    start_date: str
    end_date: Optional[str]
    summary: Optional[str]
    responsibilities: List[str]


class Project(BaseModel):
    name: str
    technologies: str
    date: str
    description: List[str]


class Resume(BaseModel):
    name: str
    # contact: Contact
    profile: Profile
    experience: List[ExperienceEntry]
    projects: List[Project]

    # education: List[EducationEntry]
    # certifications: Optional[List[Certification]]

class ResumeRequest(BaseModel):
    job_description: str
    current_resume: str
    companyName: str
    role: str
    profile_id: int | None = None

class EvaluateRequest(BaseModel):
    job_description: str
    resume: str

class OptimizeRequest(BaseModel):
    job_description: str
    resume: str

class SaveSelectedResumeRequest(BaseModel):
    id: str
    status: str  # 0 for original, 1 for optimized
    atsscore: int | None = None
    optimizedscore: int | None = None
    optimizedResume: str | None = None
    generatedResume: str | None = None


class UserProfile(BaseModel):
    id: int | None = None
    name: str
    phone: str
    email: str
    github: str
    resumes: list[str]

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

SECRET_KEY = os.getenv("FASTAPI_SECRET", "change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_current_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Missing authentication")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token")
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("SELECT id, email, name FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User not found")
    return {"id": row[0], "email": row[1], "name": row[2]}

@app.post("/signup")
def signup(data: SignupRequest):
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    try:
        hashed = get_password_hash(data.password)
        c.execute(
            "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
            (data.email, hashed, data.name),
        )
        conn.commit()
        
        user_id = c.lastrowid
    except sqlite3.IntegrityError:
        return JSONResponse(content={"error": "Email already exists"}, status_code=400)
    finally:
        conn.close()
        token = create_access_token({"sub": str(user_id)})

    return {
        "user": {"id": user_id, "email": data.email, "name": data.name},
        "token": token,
    }

@app.post("/login")
def login(data: LoginRequest):
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("SELECT id, password, name FROM users WHERE email = ?", (data.email,))
    row = c.fetchone()
    conn.close()

    if not row or not verify_password(data.password, row[1]):
        return JSONResponse(content={"error": "Invalid credentials"}, status_code=401)
    token = create_access_token({"sub": str(row[0])})

    return {
        "user": {"id": row[0], "email": data.email, "name": row[2]},
        "token": token,
    }


@app.on_event("startup")
def create_user_table():
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT
        )
    """)
    conn.commit()
    conn.close()



@traceable(run_type="llm", name="generate_resume")
def generate(job_description, current_resume):
    client = genai.Client(
        vertexai=True,
        project="schedulai-457519",
        location="global",
    )

    msg1_text1 = types.Part.from_text(text=f"""You will receive a **Job Description (JD)** and a **Current Resume**.  
Your mission: rewrite *only* the **Work Experience** and **Skills** sections so the resume aligns crisply with the JD—while staying 100 % truthful to the source material.


Inputs:
• Job Description (JD) - {job_description}
• Current Resume - {current_resume}

Task: Rewrite only the Work Experience and Skills sections of the resume so they strongly reflect the requirements in the JD. 

Note: Give In JSON format.

Detailed Instructions

Identify Core Keywords
• Extract the most important hard skills, soft skills, technologies, and domain terms from the JD (e.g., “Spring Boot,” “Elasticsearch,” “RCA”).
• Mirror the JD's phrasing in the final output wherever it matches the candidate's experience.

Work Experience (2 most recent roles)
• Generate exactly 10 powerful bullet points per role.
• Each bullet must start with a strong action verb and include a quantifiable metric (%, $, #, time saved, throughput, etc.).
• Weave in the JD keywords naturally—do not fabricate achievements that are not supported by the resume.
• Keep bullets concise and results-oriented.

Skills Section
• Create a categorized list (e.g., Programming Languages, Frameworks, Cloud & DevOps, Methodologies).
• Ensure every listed skill is demonstrably used or referenced in the Work Experience bullets.

Consistency Checks
• Do not invent new companies, titles, or dates.
• Maintain the original chronology of roles.
• Use US spelling and professional, concise language throughout.

Formatting Requirements
• Use plain text with clear section headers: Work Experience, Skills, Professional Summary.
• Bullets should use as the bullet symbol—no nested bullets or numbering.
• Align dates right-justified only if present in the source resume.

Professional Summary (3-4 lines)
• Place this after the Skills section.
• Summarize the candidate's top 3-4 selling points, mirroring the JD's highest-priority competencies and metrics.""")
    si_text1 = """You are an elite resume-optimization assistant. Your goal is to transform a candidate's resume so that it aligns crisply with a specific job description, while remaining 100 % truthful to the source material. You must emphasize impact, metrics, and the exact keywords that modern Applicant Tracking Systems (ATS) look for."""

    model = "gemini-2.5-flash"
    contents = [
        types.Content(
            role="user",
            parts=[
                msg1_text1
            ]
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        top_p=1,
        seed=0,
        max_output_tokens=65535,
        safety_settings=[types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_HARASSMENT",
            threshold="OFF"
        )],
        system_instruction=[types.Part.from_text(text=si_text1)],
        thinking_config=types.ThinkingConfig(
            thinking_budget=-1,
        ),
        response_schema = Resume.model_json_schema(),
        response_mime_type = "application/json",


    )

    result = ""
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        result += chunk.text
    return result

@app.post("/generate_resume")
def generate_resume(data: ResumeRequest, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    output = generate(data.job_description, data.current_resume)
    # Store the result in a SQLite database
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT,company TEXT,date TEXT,role TEXT,status INTEGER,atsScore INTEGER,content TEXT, profile_id INTEGER, user_id INTEGER)"
    )
    c.execute(
        "INSERT INTO results (date, company, role, content, status, atsScore, profile_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (datetime.now().isoformat(), data.companyName, data.role, output, 1, 95, data.profile_id, user_id)
    )
    conn.commit()
    conn.close()
    return JSONResponse(content={"result": output, "id": c.lastrowid})

@app.get("/results")
def get_all_results(user_id: int = Depends(get_current_user)):
    user_id=user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT,company TEXT,date TEXT,role TEXT,status INTEGER,atsScore INTEGER,content TEXT, profile_id INTEGER, user_id INTEGER)"
    )
    c.execute(
        "SELECT id, company, date, role, status, atsScore, content FROM results WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    )
    rows = c.fetchall()
    conn.close()
    results = []
    for row in rows:
        results.append({
            "id": row[0],
            "companyName": row[1],
            "date": row[2],
            "role": row[3],
            "status": "generated" if row[4] == 0 else "optimized",
            "atsScore": row[5],
            "content": row[6]
        })
    return {"results": results}

@traceable(run_type="llm", name="rewrite_resume")
def rewrite_resume(job_desc: str,
                   resume: str,
                   feedback: str | None = None) -> str:
    client = genai.Client(
        vertexai=True,
        project="schedulai-457519",
        location="global",
    )
    """Return an updated résumé (Work Experience + Skills) aligned to JD.
       Optionally incorporates ATS feedback from a previous round."""
    
    # ---- build dynamic prompt ----------------------------------
    base_user_prompt =types.Part.from_text(text= f"""
You will receive a **Job Description (JD)** and a **Current Resume**.
Rewrite *only* the **Work Experience** and **Skills** sections so they align crisply with the JD—while remaining 100 % truthful.

{f" **ATS Feedback to Address**: {feedback}" if feedback else ""}
────────────────────────────────────────────────
Inputs:
• Job Description (JD) - {job_desc}
• Current Resume - {resume}
Task: Rewrite only the Work Experience and Skills sections of the resume so they strongly reflect the requirements in the JD.

Detailed Instructions

Identify Core Keywords
• Extract the most important hard skills, soft skills, technologies, and domain terms from the JD (e.g., “Spring Boot,” “Elasticsearch,” “RCA”).
• Mirror the JD's phrasing in the final output wherever it matches the candidate's experience.

Work Experience (2 most recent roles)
• Generate exactly 10 powerful bullet points per role.
• Each bullet must start with a strong action verb and include a quantifiable metric (%, $, #, time saved, throughput, etc.).
• Weave in the JD keywords naturally—do not fabricate achievements that are not supported by the resume.
• Keep bullets concise  and results oriented.

Skills Section
• Create a categorized list (e.g., Programming Languages, Frameworks, Cloud & DevOps, Methodologies).
• Ensure every listed skill is demonstrably used or referenced in the Work Experience bullets.

Consistency Checks
• Do not invent new companies, titles, or dates.
• Maintain the original chronology of roles.
• Use US spelling and professional, concise language throughout.

Formatting Requirements
• Use plain text with clear section headers: Work Experience, Skills, Professional Summary.
• Bullets should use as the bullet symbol—no nested bullets or numbering.
• Align dates right-justified only if present in the source resume.

Professional Summary (3-4 lines)
• Place this after the Skills section.
• Summarize the candidate's top 3-4 selling points, mirroring the JD's highest-priority competencies and metrics.
""")

    system_instruction="""
        "You are an elite resume-optimization assistant. Your goal is to transform a candidate's resume so that it aligns crisply with a specific job description, while remaining 100 % truthful to the source material. You must emphasize impact, metrics, and the exact keywords that modern Applicant Tracking Systems (ATS) look for.
"""

    model = "gemini-2.5-flash"
    contents = [
        types.Content(
            role="user",
            parts=[
                base_user_prompt
            ]
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        top_p=1,
        seed=0,
        max_output_tokens=65535,
        safety_settings=[types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_HARASSMENT",
            threshold="OFF"
        )],
        system_instruction=[types.Part.from_text(text=system_instruction)],
        thinking_config=types.ThinkingConfig(
            thinking_budget=-1,
        ),
        response_schema = Resume.model_json_schema(),
        response_mime_type = "application/json",
    )

    result = ""
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        result += chunk.text
    return result


@traceable(run_type="llm", name="evaluate_resume")
def evaluate_resume(job_desc: str, resume: str) -> tuple[int, str]:
    client = genai.Client(
        vertexai=True,
        project="schedulai-457519",
        location="global",
    )
    """Return (ATS score, explanation)."""
    eval_prompt = types.Part.from_text(text= f"""
Resume:
{resume}

Job Description:
{job_desc}

Instructions:
• Analyze the resume against the job description.
• Provide an ATS score (out of 100) and a brief explanation.
• If you lack info, say: "I'm so happy you've…"

Output format:
ATS Score: [Score]/100
Explanation: [Explanation]
""")
    system_instructions = """
        You are an elite ATS evaluator. Your task is to analyze a résumé against a job description and score.
    """
    
    model = "gemini-2.5-flash"
    content = [
        types.Content(
            role="user",
            parts=[
                eval_prompt
            ]
        ),
    ]

    generate_content_configs = types.GenerateContentConfig(
        temperature=1,
        top_p=1,
        seed=0,
        max_output_tokens=65535,
        safety_settings=[types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold="OFF"
        ), types.SafetySetting(
            category="HARM_CATEGORY_HARASSMENT",
            threshold="OFF"
        )],
        system_instruction=[types.Part.from_text(text=system_instructions)],
        thinking_config=types.ThinkingConfig(
            thinking_budget=-1,
        ),
    )
    resp = client.models.generate_content(
        model    = model,
        contents = content,
        config   = generate_content_configs,
    )
    text = resp.text
    # --- extract numeric score ----------------------------------
    match = re.search(r"ATS\s+Score:\s*(\d+)\s*/\s*100", text)
    score = int(match.group(1)) if match else 0
    explanation = re.sub(r"^.*Explanation:\s*", "", text, flags=re.S).strip()
    return score, explanation

@app.post("/evaluate_ats")
def evaluate_ats(data: EvaluateRequest):
    score, explanation = evaluate_resume(data.job_description, data.resume)
    return {"atsScore": score, "explanation": explanation}

@app.post("/optimize_resume")
def optimize_resume_api(data: OptimizeRequest):
    job_desc = data.job_description
    resume = data.resume
    feedback = None
    for roundno in range(1, MAX_ROUNDS + 1):
        resume = rewrite_resume(job_desc, resume, feedback)
        score, explanation = evaluate_resume(job_desc, resume)
        if score >= TARGET_SCORE:
            break
        feedback = (
            f"The current ATS score is {score}/100. "
            f"Improve the résumé by addressing these weaknesses: {explanation}"
        )
    return {"optimized_resume": resume, "final_score": score, "explanation": explanation}

@app.post("/saveselectedresume")
def save_selected_resume(data: SaveSelectedResumeRequest):
    integer_number = int(data.id)
    if data.status == "optimized":
        status = 1
        score = data.optimizedscore
        content = data.optimizedResume
    else:
        status = 0
        score = data.atsscore
        content = data.generatedResume
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("UPDATE results SET status = ?, atsScore = ?, content = ? WHERE id = ?", (status, score, content, integer_number))
    conn.commit()
    conn.close()
    return {"message": "Status, score, and content updated successfully", "id": data.id, "status": data.status, "score": score, "content": content}

@app.get("/resume/{resume_id}")
def get_resume_by_id(resume_id: str, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    res = int(resume_id)
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT,company TEXT,date TEXT,role TEXT,status INTEGER,atsScore INTEGER,content TEXT, profile_id INTEGER, user_id INTEGER)"
    )
    c.execute(
        "SELECT id, company, date, role, status, atsScore, content, profile_id FROM results WHERE id = ? AND user_id = ?",
        (res, user_id),
    )
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "id": row[0],
            "companyName": row[1],
            "date": row[2],
            "role": row[3],
            "status": "generated" if row[4] == 0 else "optimized",
            "atsScore": row[5],
            "content": row[6],
            "profile_id": row[7]
        }
    else:
        return {"error": "Resume not found"}

@app.get("/pdf/{resume_id}")
def generate_pdf_api(resume_id: str, request: Request, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    # profile_id = request.query_params.get("profile_id")  # No longer needed
    res = int(resume_id)
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT,company TEXT,date TEXT,role TEXT,status INTEGER,atsScore INTEGER,content TEXT, profile_id INTEGER, user_id INTEGER)"
    )
    c.execute("SELECT content, profile_id FROM results WHERE id = ? AND user_id = ?", (res, user_id))
    row = c.fetchone()
    if not row:
        conn.close()
        return JSONResponse(content={"error": "Resume not found"}, status_code=404)
    content, stored_profile_id = row

    # Always use stored_profile_id, default to 1 if missing
    profile_id = int(stored_profile_id) if stored_profile_id else 1

    c.execute("SELECT name, phone, email, github FROM user_profile WHERE id = ?", (profile_id,))
    profile_row = c.fetchone()
    conn.close()

    extra = {}
    if profile_row:
        extra = {
            "name": profile_row[0] or "",
            "contact": {
                "phone": profile_row[1] or "",
                "email": profile_row[2] or "",
                "github": profile_row[3] or ""
            }
        }

    try:
        resume_data = json.loads(content)
    except Exception:
        resume_data = {}

    resume_data.update(extra)
    pdf_path = f"resume_{resume_id}.pdf"
    generate_pdf_from_content(resume_data, pdf_path)
    return FileResponse(pdf_path, media_type="application/pdf", filename=pdf_path)

@app.get("/profiles")
def list_profiles(user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            email TEXT,
            github TEXT,
            resumes TEXT,
            user_id INTEGER
        )
    """)
    c.execute(
        "SELECT id, name, phone, email, github, resumes FROM user_profile WHERE user_id = ?",
        (user_id,),
    )
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": row[0],
            "name": row[1],
            "phone": row[2],
            "email": row[3],
            "github": row[4],
            "resumes": json.loads(row[5]) if row[5] else []
        }
        for row in rows
    ]

@app.post("/profiles")
def create_profile(profile: UserProfile, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            email TEXT,
            github TEXT,
            resumes TEXT,
            user_id INTEGER
        )
    """)
    c.execute("INSERT INTO user_profile (name, phone, email, github, resumes, user_id) VALUES (?, ?, ?, ?, ?, ?)",
              (profile.name, profile.phone, profile.email, profile.github, json.dumps(profile.resumes), user_id))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"id": new_id, "message": "Profile created"}

@app.put("/profiles/{profile_id}")
def update_profile(profile_id: int, profile: UserProfile, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("UPDATE user_profile SET name=?, phone=?, email=?, github=?, resumes=? WHERE id=? AND user_id=?",
              (profile.name, profile.phone, profile.email, profile.github, json.dumps(profile.resumes), profile_id, user_id))
    conn.commit()
    conn.close()
    return {"message": "Profile updated"}

@app.delete("/profiles/{profile_id}")
def delete_profile(profile_id: int, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("DELETE FROM user_profile WHERE id=? AND user_id=?", (profile_id, user_id))
    conn.close()
    return {"message": "Profile deleted"}

@app.get("/profiles/{profile_id}")
def get_profile(profile_id: int, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("SELECT id, name, phone, email, github, resumes FROM user_profile WHERE id=? AND user_id=?", (profile_id, user_id))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "id": row[0],
            "name": row[1],
            "phone": row[2],
            "email": row[3],
            "github": row[4],
            "resumes": json.loads(row[5]) if row[5] else []
        }
    else:
        return {"error": "Profile not found"}
        
@app.post("/profile")
def save_profile(profile: UserProfile, user_id: int = Depends(get_current_user)):
    user_id = user_id["id"]
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY,
            name TEXT,
            phone TEXT,
            email TEXT,
            github TEXT,
            resumes TEXT,
            user_id INTEGER
        )
    """)
    c.execute("SELECT id FROM user_profile WHERE id = 1 AND user_id = ?", (user_id,))
    exists = c.fetchone()
    if exists:
         c.execute("UPDATE user_profile SET name=?, phone=?, email=?, github=?, resumes=? WHERE id=1 AND user_id=?",
                  (profile.name, profile.phone, profile.email, profile.github, json.dumps(profile.resumes), user_id))
    else:
        c.execute("INSERT INTO user_profile (id, name, phone, email, github, resumes, user_id) VALUES (1,?,?,?,?,?,?)",
                  (profile.name, profile.phone, profile.email, profile.github, json.dumps(profile.resumes), user_id))
    conn.commit()
    conn.close()
    return {"message": "Profile saved"}

if __name__ == "__main__":
    uvicorn.run("res:app", host="0.0.0.0", port=8000, reload=True)