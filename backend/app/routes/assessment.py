from flask import Blueprint, request, jsonify

from app.services.session_store import (
    sessions,
    create_session,
    get_session,
    add_question,
    add_response,
    set_confidence,
)

from app.services.question_generator import generate_question, generate_batch_questions
from app.services.gemini_analyzer import analyze_response
from app.services.pdf_parser import (
    extract_text_from_pdf_bytes,
    parse_document,
    build_structured_summary,
    extract_text_prefer_document_ai,
)
from app.services.concept_extractor import extract_concepts
from app.services.explanation_engine import explain_concept
from app.services.confidence_engine import evaluate_concept

assessment_bp = Blueprint("assessment", __name__)

@assessment_bp.route("/ingest", methods=["POST"])
def ingest_content():
    """Ingest PDF or raw text and return topics/concepts."""
    summary_source = ""
    if "pdf" in request.files:
        pdf_file = request.files["pdf"]
        text, summary_source = extract_text_prefer_document_ai(pdf_file.read())
    else:
        payload = request.get_json(silent=True) or {}
        text = payload.get("text", "")
        summary_source = "raw_text"

    if not text:
        return jsonify({"error": "No content provided"}), 400

    parsed = parse_document(text)
    # Add lightweight summaries via concept extractor
    concepts = extract_concepts(text)
    parsed["concepts"] = concepts

    summary = None
    try:
        from app.services.vertex_summarizer import summarize_text

        summary = summarize_text(text)
        summary["source"] = "vertex_ai"
    except Exception as e:
        print(f"[Vertex] Summarization fallback to heuristic: {e}")
        summary = build_structured_summary(text, parsed.get("topics", []), concepts)
        summary["source"] = summary_source or "heuristic"

    return jsonify({"success": True, **parsed, "summary": summary})


@assessment_bp.route("/explain", methods=["POST"])
def explain():
    """Explain a concept in simple terms with an example."""
    payload = request.get_json(silent=True) or {}
    title = payload.get("title")
    content = payload.get("content")
    if not title or not content:
        return jsonify({"error": "title and content are required"}), 400
    result = explain_concept(title, content)
    return jsonify({"success": True, "explanation": result})


@assessment_bp.route("/generate-question", methods=["POST"])
def generate():
    """Generate a single conceptual question."""
    payload = request.get_json(silent=True) or {}
    subject = payload.get("subject", "General")
    topic = payload.get("topic", "Concept")
    difficulty = payload.get("difficulty", "medium")
    q = generate_question(subject, topic, difficulty)
    # optionally track in a session
    session_id = payload.get("session_id")
    if session_id and session_id in sessions:
        add_question(session_id, q)
    return jsonify({"success": True, "question": q})


@assessment_bp.route("/generate-batch", methods=["POST"])
def generate_batch():
    """
    Generate a batch of questions for the confidence assessment system.
    Expects: {"domain": str, "count": int, "difficulty": str}
    - difficulty: "easy", "moderate", or "hard" (default: "moderate")
    Returns: {"success": bool, "session_id": str, "questions": list}
    """
    payload = request.get_json(silent=True) or {}
    domain = payload.get("domain", "general")
    count = payload.get("count", 10)
    difficulty = payload.get("difficulty", "moderate")
    
    # Validate difficulty
    if difficulty not in ["easy", "moderate", "hard"]:
        difficulty = "moderate"
    
    print(f"[BATCH] Generating {count} questions for domain: {domain}, difficulty: {difficulty}")
    
    # Create session
    session_id = create_session(domain, "Confidence Assessment")
    
    # Generate questions with difficulty awareness
    questions = generate_batch_questions(domain, count, difficulty)
    
    # Store questions in session
    for q in questions:
        add_question(session_id, q)
    
    return jsonify({
        "success": True,
        "session_id": session_id,
        "questions": questions
    })


@assessment_bp.route("/evaluate", methods=["POST"])
def evaluate():
    """Evaluate a user's answer and compute concept confidence."""
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "")
    answer = payload.get("answer", "")
    concept = payload.get("concept", "Concept")

    if not question or not answer:
        return jsonify({"error": "question and answer are required"}), 400

    analysis = analyze_response(question, answer)
    result = evaluate_concept(concept, [analysis])

    # minimal insights for UI
    insights = [analysis.get("short_feedback", "Review your reasoning.")]

    resp = {
        "success": True,
        "analysis": analysis,
        "confidence": result,
        "insights": insights,
    }
    return jsonify(resp)


@assessment_bp.route("/start", methods=["POST"])
def start_assessment():
    """Create a new assessment session.

    Expects JSON: {"subject": str, "topic": str}
    Returns: {"success": true, "session_id": str}
    """
    payload = request.get_json(silent=True) or {}
    subject = payload.get("subject", "General")
    topic = payload.get("topic", "Concept")
    session_id = create_session(subject, topic)
    return jsonify({"success": True, "session_id": session_id})


@assessment_bp.route("/question/<session_id>", methods=["GET"])
def get_question(session_id: str):
    """Return a question for the given session in the UI's expected shape."""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "invalid session"}), 404

    subject = session.get("subject", "General")
    topic = session.get("topic", "Concept")
    q = generate_question(subject, topic, "medium")

    # Shape to UI expectations
    import uuid
    question_id = str(uuid.uuid4())
    ui_q = {
        "question_id": question_id,
        "question": q["question"],
        "difficulty": q["difficulty"],
        "options": [
            {"key": "A", "text": "I understand fundamentals and can explain."},
            {"key": "B", "text": "I can apply with guidance."},
            {"key": "C", "text": "I am unsure about details."},
            {"key": "D", "text": "I need a basic explanation."},
        ],
    }

    add_question(session_id, {**ui_q, "topic": topic})
    return jsonify(ui_q)


@assessment_bp.route("/answer", methods=["POST"])
def submit_answer():
    """Evaluate user's explanation and confidence, return structured summary."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    question_id = payload.get("question_id")
    explanation = payload.get("explanation", "")
    self_confidence = payload.get("self_confidence", 50)

    if not session_id or not question_id:
        return jsonify({"error": "session_id and question_id required"}), 400

    session = get_session(session_id)
    if not session:
        return jsonify({"error": "invalid session"}), 404

    # Find question text
    q_list = session.get("questions", [])
    q_item = next((q for q in q_list if q.get("question_id") == question_id), None)
    if not q_item:
        return jsonify({"error": "question not found"}), 404

    analysis = analyze_response(q_item["question"], explanation)
    concept = session.get("topic", "Concept")
    confidence = evaluate_concept(concept, [analysis])

    add_response(session_id, {
        "question_id": question_id,
        "selected_option": payload.get("selected_option"),
        "explanation": explanation,
        "self_confidence": self_confidence,
        "analysis": analysis,
    })

    # Align with UI expectations
    result = {
        "confidence_score": confidence["confidence_score"],
        "reasoning_quality": analysis.get("reasoning_quality", 0),
        "feedback": analysis.get("short_feedback", "Review your reasoning."),
    }
    return jsonify(result)
