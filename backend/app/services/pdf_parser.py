"""
PDF and text ingestion utilities.

Responsible for extracting raw text from PDFs and producing
topic/concept level chunks suitable for downstream processing.
"""
import math
import re
from typing import List, Dict, Any, Tuple

from app.config import PROJECT_ID, DOC_AI_LOCATION, DOC_AI_PROCESSOR_ID

try:
    from PyPDF2 import PdfReader  # lightweight PDF text extraction
except Exception:  # optional dependency
    PdfReader = None  # type: ignore

try:
    from google.cloud import documentai
except Exception:  # optional dependency
    documentai = None  # type: ignore


def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Extract plain text from a PDF given its bytes.

    Returns empty string if PyPDF2 is unavailable or parsing fails.
    """
    if PdfReader is None:
        return ""
    try:
        import io
        reader = PdfReader(io.BytesIO(data))
        parts: List[str] = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            parts.append(txt)
        return "\n".join(parts)
    except Exception:
        return ""


def extract_text_with_document_ai(pdf_bytes: bytes) -> str:
    if documentai is None:
        raise RuntimeError("google-cloud-documentai is not installed")
    if not (PROJECT_ID and DOC_AI_PROCESSOR_ID):
        raise RuntimeError("Document AI configuration missing PROJECT_ID or PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(PROJECT_ID, DOC_AI_LOCATION, DOC_AI_PROCESSOR_ID)
    raw_document = documentai.RawDocument(content=pdf_bytes, mime_type="application/pdf")
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    result = client.process_document(request=request)
    doc = result.document
    return doc.text or ""


def extract_text_prefer_document_ai(pdf_bytes: bytes) -> Tuple[str, str]:
    """Attempt Document AI first; fall back to PyPDF2.

    Returns tuple (text, source)
    """
    if pdf_bytes:
        try:
            text = extract_text_with_document_ai(pdf_bytes)
            if text:
                return text, "document_ai"
        except Exception as e:
            print(f"[DocumentAI] Falling back to PyPDF2: {e}")

    text = extract_text_from_pdf_bytes(pdf_bytes)
    return text, "pypdf2"


def normalize_text(text: str) -> str:
    """Basic cleanup: collapse whitespace and strip."""
    return "\n".join(line.strip() for line in text.splitlines()).strip()


def split_into_sections(text: str) -> List[Tuple[str, str]]:
    """Heuristic split by likely headings.

    - Detect lines that look like headings (Title Case, short length)
    - Group subsequent lines as section content
    Returns list of (title, content).
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    sections: List[Tuple[str, str]] = []

    def is_heading(line: str) -> bool:
        if len(line) > 80:
            return False
        # Title Case heuristic: most words start uppercase
        tokens = [t for t in line.split() if t.isalpha()]
        if not tokens:
            return False
        upper_ratio = sum(1 for t in tokens if t[0].isupper()) / len(tokens)
        return upper_ratio > 0.6

    current_title = "Introduction"
    current_buf: List[str] = []
    for line in lines:
        if is_heading(line):
            # flush previous
            if current_buf:
                sections.append((current_title, " ".join(current_buf)))
                current_buf = []
            current_title = line
        else:
            current_buf.append(line)
    if current_buf:
        sections.append((current_title, " ".join(current_buf)))

    return sections


def parse_document(text: str) -> Dict[str, Any]:
    """Produce topics and concept-level chunks from raw text.

    Output shape:
    {
        "topics": ["Binary Search", ...],
        "concepts": [{"title": str, "content": str}],
    }
    """
    clean = normalize_text(text)
    sections = split_into_sections(clean)
    topics = [title for title, _ in sections]
    concepts = [{"title": title, "content": content} for title, content in sections]
    return {"topics": topics, "concepts": concepts}


def build_structured_summary(text: str, topics: List[str], concepts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Create a UI-friendly summary shape without external dependencies.

    Fields: title, overview, key_concepts, main_topics, difficulty_level, estimated_read_time_minutes
    """
    clean = normalize_text(text)
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", clean) if s]
    word_count = len(clean.split())

    # Overview: first few sentences capped for readability
    overview_parts: List[str] = []
    total_len = 0
    for s in sentences:
        if total_len + len(s) > 960:  # Increased from 480 for more detailed overview
            break
        overview_parts.append(s)
        total_len += len(s)
        if len(overview_parts) >= 6:  # Increased from 3 to get 4-6 sentences
            break
    overview = " ".join(overview_parts) if overview_parts else clean[:960]

    # Title/key concepts fall back to detected topics
    title = topics[0] if topics else "Document Summary"
    key_concepts = topics[:8] if topics else []

    # Main topics derived from concept summaries/content
    main_topics: List[Dict[str, Any]] = []
    for concept in concepts[:6]:
        desc_source = concept.get("summary") or concept.get("content", "")
        # Expand description to be more detailed (increased from 420 to 840 chars)
        description = desc_source[:840] if len(desc_source) > 200 else desc_source
        
        # Extract key points from the content (simple sentence extraction)
        key_points = []
        content_text = concept.get("content", "")
        if content_text:
            # Split into sentences and take the most substantial ones
            content_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", content_text) if s.strip()]
            key_points = [s for s in content_sentences[:5] if len(s) > 30][:3]
        
        main_topics.append({
            "name": concept.get("title", "Topic"),
            "description": description,
            "key_points": key_points if key_points else None,
        })

    # Difficulty heuristic based on sentence length and size
    avg_sentence_len = word_count / max(1, len(sentences))
    if word_count > 1800 or avg_sentence_len > 25:
        difficulty = "Advanced"
    elif word_count > 1000 or avg_sentence_len > 18:
        difficulty = "Intermediate"
    else:
        difficulty = "Beginner"

    # Estimated read time at ~200 words/min
    est_read_time = max(1, math.ceil(word_count / 200))

    return {
        "title": title,
        "overview": overview,
        "key_concepts": key_concepts,
        "main_topics": main_topics,
        "difficulty_level": difficulty,
        "estimated_read_time_minutes": est_read_time,
    }
