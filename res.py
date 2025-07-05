from google import genai
from google.genai import types
import base64
import sqlite3
from datetime import datetime
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import uvicorn
from langsmith import traceable
from fastapi.middleware.cors import CORSMiddleware 
import re

from dotenv import load_dotenv
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

class ResumeRequest(BaseModel):
    job_description: str
    current_resume: str
    companyName: str
    role: str

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

Detailed Instructions

Identify Core Keywords
• Extract the most important hard skills, soft skills, technologies, and domain terms from the JD (e.g., “Spring Boot,” “Elasticsearch,” “RCA”).
• Mirror the JD's phrasing in the final output wherever it matches the candidate's experience.

Work Experience (2 most recent roles)
• Generate exactly 10 powerful bullet points per role.
• Each bullet must start with a strong action verb and include a quantifiable metric (%, $, #, time saved, throughput, etc.).
• Weave in the JD keywords naturally—do not fabricate achievements that are not supported by the resume.
• Keep bullets concise (≤ 25 words each) and results oriented.

Skills Section
• Create a categorized list (e.g., Programming Languages, Frameworks, Cloud & DevOps, Methodologies).
• Prioritize JD keywords first; omit skills that are irrelevant to the JD.
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
def generate_resume(data: ResumeRequest):
    output = generate(data.job_description, data.current_resume)
    # Store the result in a SQLite database
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT,company TEXT,date TEXT,role TEXT,status INTEGER,atsScore INTEGER,content TEXT )"
    )
    c.execute(
        "INSERT INTO results (date, company, role, content, status, atsScore) VALUES (?, ?, ?, ?, ?, ?)",
        (datetime.now().isoformat(), data.companyName, data.role, output, 1, 95)
    )
    conn.commit()
    conn.close()
    return JSONResponse(content={"result": output, "id": c.lastrowid})

@app.get("/results")
def get_all_results():
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("SELECT id, company, date, role, status, atsScore, content FROM results ORDER BY id DESC")
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
• Keep bullets concise (≤ 25 words each) and results oriented.

Skills Section
• Create a categorized list (e.g., Programming Languages, Frameworks, Cloud & DevOps, Methodologies).
• Prioritize JD keywords first; omit skills that are irrelevant to the JD.
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
        You are an elite resume-optimization assistant. Emphasize impact, metrics,and exact JD keywords so modern ATS parsers score the résumé highly.
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
    else:
        status = 0
        score = data.atsscore
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("UPDATE results SET status = ?, atsScore = ? WHERE id = ?", (status, score, integer_number))
    conn.commit()
    conn.close()
    return {"message": "Status and score updated successfully", "id": data.id, "status": data.status, "score": score}

@app.get("/resume/{resume_id}")
def get_resume_by_id(resume_id: str):
    res=int(resume_id)
    conn = sqlite3.connect("results.db")
    c = conn.cursor()
    c.execute("SELECT id, company, date, role, status, atsScore, content FROM results WHERE id = ?", (res,))
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
            "content": row[6]
        }
    else:
        return {"error": "Resume not found"}
if __name__ == "__main__":
    uvicorn.run("res:app", host="0.0.0.0", port=8000, reload=True)