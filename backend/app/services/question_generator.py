from app.services.gemini_analyzer import call_gemini
from app.services.question_validator import validate_and_fix_question
import json
import re
import uuid
import random
import time


def generate_question(subject: str, topic: str, difficulty: str = "medium") -> dict:
    """
    Generates a domain-specific question using Gemini AI.
    Returns dict: {question, difficulty}
    """
    
    # Add dynamic context to ensure fresh generation
    timestamp = int(time.time() * 1000)
    unique_seed = str(uuid.uuid4())[:8]

    prompt = f"""
You are an expert educational assessment designer specializing in {subject}.

IMPORTANT: This is a fresh assessment attempt (ID: {unique_seed}, timestamp: {timestamp}). 
Generate a UNIQUE question that is different from any previous questions, even if the domain and difficulty are the same.
DO NOT repeat previously generated questions. Cover different subtopics, angles, or perspectives.

Generate ONE industry-relevant, thought-provoking question about: {topic}

Difficulty level: {difficulty}

Guidelines:
- Ask a question that tests conceptual understanding, not memorization
- For medium/hard: include scenario-based or real-world application context
- The question should reveal depth of understanding when answered
- Make it suitable for interview or professional assessment
- Ensure conceptual variety and uniqueness

Output ONLY valid JSON (no markdown, no extra text):
{{
  "question": "your question here",
  "difficulty": "{difficulty}"
}}
"""

    try:
        import traceback
        text = call_gemini(prompt)
        print(f"[DEBUG] Gemini raw response: {text[:200]}")
        
        # Strip markdown code blocks if present
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'```\s*$', '', text, flags=re.MULTILINE)
        text = text.strip()
        
        data = json.loads(text)
        question_text = data.get("question", "").strip()
        
        if not question_text:
            raise ValueError("Empty question from Gemini")
        
        print(f"[SUCCESS] Generated question: {question_text[:100]}")
        return {
            "question": question_text,
            "difficulty": data.get("difficulty", difficulty),
        }
    except Exception as e:
        print(f"[ERROR] Gemini question generation failed: {e}")
        traceback.print_exc()
        # Fallback only when Gemini completely fails
        return {
            "question": f"Explain the key principles of {topic} in {subject} and provide a real-world example demonstrating your understanding.",
            "difficulty": difficulty,
        }


def generate_question_with_answer(domain: str, topic: str, difficulty: str = "moderate", segment: str = None) -> dict:
    """
    Generate a complete question with STRICT format enforcement.
    
    Easy: MCQ only (4 options, definitions/terminology)
    Moderate: MCQ only (4 options, application-based)
    Hard: Alternating segments
      - Segment 1 (MCQ_REASONING): MCQ + reasoning explanation required
      - Segment 2 (ASSERTION_REASON): Assertion-Reasoning format
    
    Returns dict with: question_id, question, options, correct_answer, topic, difficulty, segment, reasoning_required
    """
    
    # Add dynamic context to prevent repetition
    timestamp = int(time.time() * 1000)
    unique_seed = str(uuid.uuid4())[:8]
    random_variation = random.randint(1000, 9999)
    
    # Add random perspective/focus to ensure different questions each time
    perspectives = [
        "practical application perspective",
        "theoretical understanding angle",
        "real-world scenario context",
        "industry best practices focus",
        "edge case and limitations view",
        "comparative analysis approach",
        "problem-solving methodology",
        "design trade-offs consideration"
    ]
    selected_perspective = random.choice(perspectives)
    
    # Add random question style variation
    style_variations = [
        "Focus on WHY and HOW aspects",
        "Emphasize WHEN and WHERE scenarios",
        "Explore trade-offs and comparisons",
        "Test critical thinking and analysis",
        "Challenge common misconceptions",
        "Evaluate decision-making criteria"
    ]
    selected_style = random.choice(style_variations)
    
    # Determine segment type for Hard difficulty
    if difficulty == "hard":
        if segment == "A":
            segment_type = "MCQ_REASONING"
        elif segment == "B":
            segment_type = "ASSERTION_REASON"
        else:
            # Default to alternating if not specified
            segment_type = "MCQ_REASONING"
    elif difficulty == "moderate":
        segment_type = "MCQ"
    else:  # easy
        segment_type = "MCQ"
    
    # Build difficulty-specific prompt instructions
    if difficulty == "easy":
        prompt = f"""
You are an expert educational assessment designer for {domain}.

CRITICAL - UNIQUENESS REQUIREMENT (Assessment ID: {unique_seed}, Timestamp: {timestamp}, Variation: {random_variation}):
This is a FRESH assessment attempt. You MUST generate a COMPLETELY NEW and UNIQUE question.
DO NOT repeat, rephrase, or recycle ANY previously generated questions.
Use {selected_perspective} to create a fresh angle on {topic}.
{selected_style}.

Generate ONE EASY multiple-choice question about: {topic}

STRICT REQUIREMENTS:
- Format: Multiple Choice Question (MCQ) ONLY
- Test surface-level understanding (definitions, basic concepts, terminology)
- Question style: "What is...", "Which of the following...", "Define..."
- Provide EXACTLY 4 options labeled A, B, C, D
- Single correct answer
- NO reasoning required
- NO application scenarios
- NO complex analysis

Output ONLY valid JSON (no markdown, no code blocks):
{{
  "question": "your MCQ question text here",
  "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
  "correct_answer": "A",
  "topic": "{topic}",
  "difficulty": "easy"
}}
"""
    
    elif difficulty == "moderate":
        prompt = f"""
You are an expert educational assessment designer for {domain}.

CRITICAL - UNIQUENESS REQUIREMENT (Assessment ID: {unique_seed}, Timestamp: {timestamp}, Variation: {random_variation}):
This is a FRESH assessment attempt. You MUST generate a COMPLETELY NEW and UNIQUE question.
DO NOT repeat, rephrase, or recycle ANY previously generated questions.
Use {selected_perspective} to create a fresh angle on {topic}.
{selected_style}.

Generate ONE MODERATE multiple-choice question about: {topic}

STRICT REQUIREMENTS:
- Format: Multiple Choice Question (MCQ) ONLY
- Test application + understanding of concepts
- Include real-world context or practical scenarios
- Question style: "How would...", "Why does...", "When would you..."
- Provide EXACTLY 4 options labeled A, B, C, D
- Single correct answer
- Requires logical elimination and domain application
- More difficult than basic concept recall
- NO pure definition questions

Output ONLY valid JSON (no markdown, no code blocks):
{{
  "question": "your MCQ question text here",
  "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
  "correct_answer": "B",
  "topic": "{topic}",
  "difficulty": "moderate"
}}
"""
    
    elif difficulty == "hard" and segment_type == "MCQ_REASONING":
        # HARD - SEGMENT 1: MCQ + Reasoning
        prompt = f"""
You are an expert educational assessment designer for {domain}.

CRITICAL - UNIQUENESS REQUIREMENT (Assessment ID: {unique_seed}, Timestamp: {timestamp}, Variation: {random_variation}):
This is a FRESH assessment attempt. You MUST generate a COMPLETELY NEW and UNIQUE question.
DO NOT repeat, rephrase, or recycle ANY previously generated questions.
Use {selected_perspective} to create a fresh angle on {topic}.
{selected_style}.

Generate ONE HARD multiple-choice question with reasoning requirement about: {topic}

STRICT REQUIREMENTS - SEGMENT 1 (MCQ + REASONING):
- Format: Multiple Choice Question with MANDATORY reasoning explanation
- Test complex objective reasoning
- Require multi-step logical thinking
- Interview-level difficulty
- Provide EXACTLY 4 options labeled A, B, C, D
- Single correct answer
- User MUST provide reasoning explanation in addition to selecting option
- Question should be answerable only with deep logical deduction

Output ONLY valid JSON (no markdown, no code blocks):
{{
  "question": "your complex MCQ question text here",
  "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
  "correct_answer": "C",
  "reasoning_explanation": "Brief explanation of why this is correct and why others are wrong",
  "topic": "{topic}",
  "difficulty": "hard"
}}
"""
    
    elif difficulty == "hard" and segment_type == "ASSERTION_REASON":
        # HARD - SEGMENT 2: Assertion-Reasoning
        prompt = f"""
You are an expert educational assessment designer for {domain}.

CRITICAL - UNIQUENESS REQUIREMENT (Assessment ID: {unique_seed}, Timestamp: {timestamp}, Variation: {random_variation}):
This is a FRESH assessment attempt. You MUST generate a COMPLETELY NEW and UNIQUE question.
DO NOT repeat, rephrase, or recycle ANY previously generated questions.
Use {selected_perspective} to create a fresh angle on {topic}.
{selected_style}.

Generate ONE HARD assertion-reasoning question about: {topic}

STRICT REQUIREMENTS - SEGMENT 2 (ASSERTION-REASONING):
- Format: Assertion-Reasoning type question
- Provide two statements:
  - Assertion (A): A statement about the concept
  - Reason (R): A reasoning or explanation statement
- Test logical relationships and conceptual correctness
- Use case-based or hypothetical scenarios
- Provide EXACTLY 4 standard options:
  A) Both A and R are true, and R is the correct explanation of A
  B) Both A and R are true, but R is NOT the correct explanation of A
  C) A is true, but R is false
  D) A is false, but R is true
- Single correct answer
- Test logical dependency and concept validation

Output ONLY valid JSON (no markdown, no code blocks):
{{
  "assertion": "Assertion (A): statement about concept",
  "reason": "Reason (R): explanation or reasoning statement",
  "options": [
    "A) Both A and R are true, and R is the correct explanation of A",
    "B) Both A and R are true, but R is NOT the correct explanation of A",
    "C) A is true, but R is false",
    "D) A is false, but R is true"
  ],
  "correct_answer": "A",
  "topic": "{topic}",
  "difficulty": "hard"
}}
"""
    
    else:
        # Fallback to moderate
        segment_type = "MCQ"
        prompt = f"""
Generate a moderate difficulty MCQ about {topic} in {domain} with exactly 4 options.
"""
    
    try:
        text = call_gemini(prompt)
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'```\s*$', '', text, flags=re.MULTILINE)
        text = text.strip()
        
        data = json.loads(text)
        
        # Validate and structure response based on segment type
        if segment_type == "ASSERTION_REASON":
            # Assertion-Reasoning format
            assertion = data.get("assertion", "").strip()
            reason = data.get("reason", "").strip()
            options = data.get("options", [])
            
            # Validation
            if not assertion or not reason:
                raise ValueError("Missing assertion or reason")
            if len(options) != 4:
                raise ValueError(f"Expected 4 options, got {len(options)}")
            
            # Build combined question text
            question_text = f"{assertion}\n\n{reason}"
            
            return {
                "question_id": str(uuid.uuid4()),
                "question": question_text,
                "options": options,
                "correct_answer": data.get("correct_answer", "A").strip(),
                "topic": data.get("topic", topic),
                "difficulty": difficulty,
                "segment": segment_type,
                "reasoning_required": False,  # No additional reasoning for A-R type
            }
        
        else:
            # MCQ or MCQ_REASONING format
            question_text = data.get("question", "").strip()
            options = data.get("options", [])
            
            # Validation
            if not question_text:
                raise ValueError("Empty question text")
            if len(options) != 4:
                raise ValueError(f"Expected 4 options, got {len(options)}")
            
            return {
                "question_id": str(uuid.uuid4()),
                "question": question_text,
                "options": options,
                "correct_answer": data.get("correct_answer", "A").strip(),
                "topic": data.get("topic", topic),
                "difficulty": difficulty,
                "segment": segment_type,
                "reasoning_required": (segment_type == "MCQ_REASONING"),
            }
            
    except Exception as e:
        print(f"[ERROR] Question generation failed: {e}")
        import traceback
        traceback.print_exc()
        
        # Generate varied fallback questions to avoid repetition
        fallback_starters = [
            f"How does {topic} improve system performance in {domain}?",
            f"Which scenario best demonstrates the application of {topic}?",
            f"In {domain}, when would you choose {topic} over alternative approaches?",
            f"Explain the relationship between {topic} and real-world {domain} implementations.",
            f"Which factor is most critical when implementing {topic} in {domain}?",
            f"Compare the advantages of using {topic} in different {domain} contexts.",
            f"Identify the key characteristic that defines {topic} in {domain}.",
            f"What trade-off is associated with applying {topic} in {domain} systems?",
        ]
        
        fallback_options_sets = [
            [
                "A) It optimizes resource allocation",
                "B) It enhances system modularity",
                "C) It improves maintainability",
                "D) It reduces computational complexity"
            ],
            [
                "A) When scalability is the primary concern",
                "B) When performance optimization is needed",
                "C) When maintainability outweighs efficiency",
                "D) When security is the top priority"
            ],
            [
                "A) High throughput with moderate latency",
                "B) Low latency with variable throughput",
                "C) Balanced performance across metrics",
                "D) Maximum reliability with minimal overhead"
            ],
            [
                "A) It provides a structured approach to problem decomposition",
                "B) It enables parallel processing capabilities",
                "C) It simplifies error handling mechanisms",
                "D) It facilitates rapid prototyping"
            ]
        ]
        
        # Randomly select fallback question and options
        selected_question = random.choice(fallback_starters)
        selected_options = random.choice(fallback_options_sets)
        correct_answers = ["A", "B", "C", "D"]
        selected_answer = random.choice(correct_answers)
        
        # Strict fallback based on difficulty
        if difficulty == "easy":
            return {
                "question_id": str(uuid.uuid4()),
                "question": selected_question,
                "options": selected_options,
                "correct_answer": selected_answer,
                "topic": topic,
                "difficulty": "easy",
                "segment": "MCQ",
                "reasoning_required": False,
            }
        elif difficulty == "moderate":
            return {
                "question_id": str(uuid.uuid4()),
                "question": selected_question,
                "options": selected_options,
                "correct_answer": selected_answer,
                "topic": topic,
                "difficulty": "moderate",
                "segment": "MCQ",
                "reasoning_required": False,
            }
        else:  # hard
            if segment_type == "ASSERTION_REASON":
                assertion_starters = [
                    f"{topic} is essential for achieving optimal performance in {domain}.",
                    f"Implementing {topic} requires understanding of underlying system constraints in {domain}.",
                    f"The effectiveness of {topic} depends on proper context evaluation in {domain}.",
                    f"Mastery of {topic} directly correlates with system reliability in {domain}."
                ]
                
                reason_starters = [
                    "It provides a systematic framework for addressing complex challenges.",
                    "It enables predictable behavior under varying conditions.",
                    "It establishes clear boundaries for system operation.",
                    "It facilitates efficient resource management and allocation."
                ]
                
                return {
                    "question_id": str(uuid.uuid4()),
                    "question": f"Assertion (A): {random.choice(assertion_starters)}\n\nReason (R): {random.choice(reason_starters)}",
                    "options": [
                        "A) Both A and R are true, and R is the correct explanation of A",
                        "B) Both A and R are true, but R is NOT the correct explanation of A",
                        "C) A is true, but R is false",
                        "D) A is false, but R is true"
                    ],
                    "correct_answer": random.choice(["A", "B"]),
                    "topic": topic,
                    "difficulty": "hard",
                    "segment": "ASSERTION_REASON",
                    "reasoning_required": False,
                }
            else:
                hard_questions = [
                    f"Analyze the trade-offs involved when implementing {topic} in {domain}. Which factor is most critical?",
                    f"In a resource-constrained {domain} environment, how would {topic} impact system design decisions?",
                    f"Evaluate the implications of choosing {topic} over alternative approaches in {domain}. What is the primary consideration?",
                    f"When optimizing for both performance and maintainability in {domain}, how does {topic} influence the balance?"
                ]
                
                hard_options_sets = [
                    [
                        "A) Performance optimization takes precedence",
                        "B) Resource allocation constraints dominate",
                        "C) Contextual requirements drive the decision",
                        "D) Scalability concerns override other factors"
                    ],
                    [
                        "A) Minimizing latency while maintaining throughput",
                        "B) Balancing complexity with maintainability",
                        "C) Ensuring reliability without excessive overhead",
                        "D) Achieving modularity while preserving efficiency"
                    ],
                    [
                        "A) System architecture compatibility",
                        "B) Development team expertise",
                        "C) Long-term maintenance costs",
                        "D) Immediate performance gains"
                    ]
                ]
                
                return {
                    "question_id": str(uuid.uuid4()),
                    "question": random.choice(hard_questions),
                    "options": random.choice(hard_options_sets),
                    "correct_answer": random.choice(["A", "B", "C", "D"]),
                    "topic": topic,
                    "difficulty": "hard",
                    "segment": "MCQ_REASONING",
                    "reasoning_required": True,
                }



def generate_batch_questions(domain: str, count: int = 10, difficulty: str = "moderate") -> list:
    """
    Generate a batch of questions for a given domain with difficulty-aware logic.
    
    Difficulty behavior:
    - "easy": All questions are easy (definitions, basic concepts)
    - "moderate": Mix of questions with practical application focus
    - "hard": Alternating segments A and B (reasoning/MCQ, case/assertion)
    
    Returns list of question dicts with: question_id, question, correct_answer, topic, difficulty
    """
    
    # Define topic pools per domain
    domain_topics = {
        "machine-learning": [
            "Supervised Learning", "Unsupervised Learning", "Neural Networks",
            "Model Evaluation", "Overfitting & Regularization", "Feature Engineering",
            "Ensemble Methods", "Deep Learning", "Transfer Learning", "Model Deployment"
        ],
        "data-science": [
            "Data Preprocessing", "Statistical Analysis", "Data Visualization",
            "Hypothesis Testing", "Regression Analysis", "Classification",
            "Clustering", "Time Series Analysis", "A/B Testing", "ETL Pipelines"
        ],
        "operating-systems": [
            "Process Management", "Memory Management", "File Systems",
            "Concurrency", "Deadlocks", "Scheduling Algorithms",
            "Virtual Memory", "I/O Management", "System Calls", "Synchronization"
        ],
        "web-development": [
            "HTTP Protocol", "RESTful APIs", "Frontend Frameworks",
            "Backend Architecture", "Database Design", "Authentication",
            "State Management", "Responsive Design", "Performance Optimization", "Security"
        ],
        "computer-networks": [
            "OSI Model", "TCP/IP Protocol", "Routing Algorithms",
            "Network Security", "DNS", "Load Balancing",
            "Network Topologies", "Firewalls", "VPN", "Quality of Service"
        ],
    }
    
    topics = domain_topics.get(domain, ["General Concepts"] * count)
    
    # For custom domains (not in predefined list), create varied topic angles
    if domain not in domain_topics:
        # Generate varied aspects/subtopics for custom domains
        custom_angles = [
            f"{domain} - Fundamentals",
            f"{domain} - Architecture & Design",
            f"{domain} - Implementation Strategies",
            f"{domain} - Best Practices",
            f"{domain} - Common Challenges",
            f"{domain} - Performance & Optimization",
            f"{domain} - Security Considerations",
            f"{domain} - Real-World Applications",
            f"{domain} - Advanced Concepts",
            f"{domain} - Industry Standards"
        ]
        topics = custom_angles
    
    # SHUFFLE topics to ensure different subtopic selection each time
    topics_copy = topics.copy()
    random.shuffle(topics_copy)
    
    # Cycle through shuffled topics if we need more questions than topics available
    selected_topics = []
    for i in range(count):
        selected_topics.append(topics_copy[i % len(topics_copy)])
    
    questions = []
    
    # Set difficulty distribution based on user's chosen level
    if difficulty == "easy":
        difficulties = ["easy"] * count
        segments = [None] * count
    elif difficulty == "hard":
        # Alternate between segment A and B for hard difficulty
        difficulties = ["hard"] * count
        segments = ["A" if i % 2 == 0 else "B" for i in range(count)]
    else:  # moderate
        # Mix of difficulties skewed toward moderate
        difficulties = ["easy", "moderate", "moderate", "moderate", "hard",
                       "moderate", "moderate", "hard", "moderate", "moderate"]
        if count > len(difficulties):
            difficulties.extend(["moderate"] * (count - len(difficulties)))
        difficulties = difficulties[:count]
        segments = [None] * count
    
    for idx, (topic, diff, segment) in enumerate(zip(selected_topics, difficulties, segments)):
        max_retries = 3
        question = None
        
        for attempt in range(max_retries):
            try:
                question = generate_question_with_answer(domain, topic, diff, segment)
                
                # Validate and auto-fix the question
                is_valid, fixed_question, error = validate_and_fix_question(question)
                
                if is_valid:
                    questions.append(fixed_question)
                    print(f"[BATCH] Generated {idx + 1}/{count}: {topic} (difficulty={diff}, segment={fixed_question.get('segment')})")
                    break
                else:
                    print(f"[BATCH] Validation failed (attempt {attempt + 1}/{max_retries}): {error}")
                    if attempt < max_retries - 1:
                        print(f"[BATCH] Regenerating question for {topic}...")
                    else:
                        # Use the fixed version anyway on last attempt
                        print(f"[BATCH] Using auto-fixed question despite validation warning")
                        questions.append(fixed_question)
            except Exception as e:
                print(f"[BATCH] Generation error (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    # On final attempt, create a simple fallback
                    print(f"[BATCH] Using fallback question for {topic}")
                    fallback = {
                        "question_id": str(uuid.uuid4()),
                        "question": f"Explain the key concepts of {topic} in {domain}.",
                        "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                        "correct_answer": "A",
                        "topic": topic,
                        "difficulty": diff,
                        "segment": "MCQ" if diff != "hard" else ("MCQ_REASONING" if segment == "A" else "ASSERTION_REASON"),
                        "reasoning_required": (diff == "hard" and segment == "A"),
                    }
                    questions.append(fallback)
    
    return questions

