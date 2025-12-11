"""
VibeTrust AI Guardian - Simple MVP
AI Trust & Compliance Checker for High-Stakes GenAI Outputs
"""

import os
import json
import re
import pathlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(
    title="VibeTrust AI Guardian",
    description="AI Trust & Compliance Checker for High-Stakes GenAI Outputs",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (frontend)
static_dir = pathlib.Path("static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory storage for history
analysis_history: List[dict] = []

import random
import hashlib

def generate_demo_analysis(answer_text: str, context_type: str) -> dict:
    """Generate a realistic demo analysis based on the input text"""
    text_hash = int(hashlib.md5(answer_text.encode()).hexdigest()[:8], 16)
    random.seed(text_hash)
    
    text_length = len(answer_text)
    has_numbers = any(c.isdigit() for c in answer_text)
    has_percentages = '%' in answer_text
    word_count = len(answer_text.split())
    
    base_score = random.randint(45, 85)
    if has_numbers and has_percentages:
        base_score -= random.randint(5, 15)
    if text_length > 500:
        base_score -= random.randint(0, 10)
    if word_count < 20:
        base_score += random.randint(5, 10)
    
    score = max(20, min(95, base_score))
    label = "High" if score >= 75 else ("Medium" if score >= 50 else "Low")
    
    words = answer_text.split()
    snippets = []
    if len(words) > 10:
        start = random.randint(0, min(5, len(words)-5))
        snippets.append(' '.join(words[start:start+random.randint(4, 8)]))
    if not snippets:
        snippets = [answer_text[:50] + "..." if len(answer_text) > 50 else answer_text]
    
    issue_templates = {
        "legal": [
            {"riskType": "hallucination", "explanation": "This statement references legal principles that require verification against current case law.", "humanCheckHint": "Verify the legal citation with a qualified attorney."},
            {"riskType": "compliance-risk", "explanation": "The language used may create unintended legal obligations.", "humanCheckHint": "Have legal counsel review before using in binding documents."},
        ],
        "finance": [
            {"riskType": "hallucination", "explanation": "Financial figures require verification against audited statements.", "humanCheckHint": "Cross-reference with official financial reports."},
            {"riskType": "compliance-risk", "explanation": "This could be interpreted as financial advice.", "humanCheckHint": "Ensure appropriate disclaimers are included."},
        ],
        "compliance": [
            {"riskType": "hallucination", "explanation": "References to regulations need verification.", "humanCheckHint": "Check current version of referenced regulations."},
            {"riskType": "compliance-risk", "explanation": "May not address all compliance requirements.", "humanCheckHint": "Conduct comprehensive compliance review."},
        ]
    }
    
    templates = issue_templates.get(context_type, issue_templates["legal"])
    num_issues = 1 if score >= 75 else (2 if score >= 50 else 3)
    issues = []
    for i in range(min(num_issues, len(snippets), len(templates))):
        template = templates[i % len(templates)]
        issues.append({
            "snippet": snippets[i % len(snippets)][:100],
            "riskType": template["riskType"],
            "explanation": template["explanation"],
            "humanCheckHint": template["humanCheckHint"]
        })
    
    context_names = {"legal": "legal", "finance": "financial", "compliance": "regulatory compliance"}
    ctx_name = context_names.get(context_type, "general")
    
    if label == "High":
        compliance_report = f"This {ctx_name} content demonstrates acceptable trust levels (score: {score}/100). Standard verification protocols should still be followed."
    elif label == "Medium":
        compliance_report = f"Moderate trust concerns identified (score: {score}/100). Several claims require independent verification before official use."
    else:
        compliance_report = f"ALERT: Low trust score ({score}/100). Significant concerns identified. Immediate escalation to legal/compliance team recommended."
    
    nda_audit_note = f"Analysis completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}. Context: {context_type.upper()}. Score: {score}/100 ({label})."
    
    return {
        "score": score,
        "label": label,
        "issues": issues,
        "complianceReport": compliance_report,
        "ndaauditNote": nda_audit_note
    }

@app.get("/")
async def read_root():
    """Serve the frontend HTML"""
    index_path = pathlib.Path("static/index.html")
    if index_path.exists():
        return FileResponse("static/index.html")
    else:
        return {
            "status": "online",
            "service": "VibeTrust AI Guardian",
            "version": "1.0.0",
            "message": "Frontend not found. API is available at /api/*"
        }

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "VibeTrust AI Guardian",
        "version": "1.0.0",
        "mode": "demo"
    }

@app.post("/api/analyze")
async def analyze_content(request: Dict[str, Any]):
    """Analyze AI-generated content for trust and compliance risks"""
    answer_text = request.get("answerText", "").strip()
    context_type = request.get("contextType", "legal").lower()
    
    if not answer_text or len(answer_text) < 10:
        raise HTTPException(status_code=400, detail="Answer text must be at least 10 characters")
    
    if context_type not in ["legal", "finance", "compliance"]:
        context_type = "legal"
    
    try:
        analysis = generate_demo_analysis(answer_text, context_type)
        timestamp = datetime.now().isoformat()
        
        result = {
            "score": analysis.get("score", 50),
            "label": analysis.get("label", "Medium"),
            "issues": analysis.get("issues", []),
            "complianceReport": analysis.get("complianceReport", ""),
            "ndaauditNote": analysis.get("ndaauditNote", ""),
            "timestamp": timestamp
        }
        
        history_entry = {
            "timestamp": timestamp,
            "contextType": context_type,
            "label": result.get("label", "Medium"),
            "score": result.get("score", 0),
            "inputPreview": answer_text[:40] + "..." if len(answer_text) > 40 else answer_text,
        }
        analysis_history.insert(0, history_entry)
        if len(analysis_history) > 50:
            analysis_history.pop()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/history")
def get_history():
    """Get recent analysis history"""
    return {"history": analysis_history[:10]}

@app.get("/api/stats")
def get_stats():
    """Get dashboard statistics"""
    if not analysis_history:
        return {
            "checksToday": 0,
            "highRiskPercentage": 0,
            "estimatedFinesAvoided": 0
        }
    
    today = datetime.now().date()
    checks_today = sum(
        1 for h in analysis_history 
        if datetime.fromisoformat(h["timestamp"]).date() == today
    )
    
    total = len(analysis_history)
    high_risk = sum(1 for h in analysis_history if h["label"] == "Low")
    high_risk_percentage = round((high_risk / total) * 100) if total > 0 else 0
    
    fines_avoided = 0
    for h in analysis_history:
        if h["label"] == "Low":
            fines_avoided += 50000
        elif h["label"] == "Medium":
            fines_avoided += 10000
    
    return {
        "checksToday": checks_today,
        "highRiskPercentage": high_risk_percentage,
        "estimatedFinesAvoided": fines_avoided
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

