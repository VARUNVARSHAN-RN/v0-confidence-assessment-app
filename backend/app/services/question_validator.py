"""
Question validation utilities for strict difficulty-based enforcement.

Ensures all generated questions conform to the required format for each difficulty level.
"""
import re
from typing import Dict, Any, Optional


def validate_question(question: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a question against strict difficulty rules.
    
    Returns: (is_valid, error_message)
    
    Rules:
    - Easy: MCQ only, 4 options, no reasoning
    - Moderate: MCQ only, 4 options, application-based
    - Hard: Segment A (MCQ + reasoning) or Segment B (Assertion-Reasoning)
    """
    
    difficulty = question.get("difficulty", "").lower()
    segment = question.get("segment", "MCQ")
    options = question.get("options", [])
    question_text = question.get("question", "")
    reasoning_required = question.get("reasoning_required", False)
    
    # Common validations
    if not question_text or len(question_text.strip()) < 10:
        return False, "Question text is too short or empty"
    
    if not options or len(options) != 4:
        return False, f"Expected exactly 4 options, got {len(options)}"
    
    # Validate options are properly labeled A, B, C, D
    expected_prefixes = ["A)", "B)", "C)", "D)"]
    for i, option in enumerate(options):
        if not option.strip().startswith(expected_prefixes[i]):
            return False, f"Option {i+1} must start with '{expected_prefixes[i]}'"
    
    correct_answer = question.get("correct_answer", "").strip().upper()
    if correct_answer not in ["A", "B", "C", "D"]:
        return False, f"Invalid correct_answer: {correct_answer}. Must be A, B, C, or D"
    
    # Difficulty-specific validations
    if difficulty == "easy":
        if segment != "MCQ":
            return False, f"Easy questions must be MCQ segment, got {segment}"
        
        if reasoning_required:
            return False, "Easy questions should not require reasoning"
        
        # Check for definition/terminology style (basic check)
        definition_keywords = ["what is", "which of the following", "define", "identify", "name"]
        is_definition_style = any(keyword in question_text.lower() for keyword in definition_keywords)
        
        if not is_definition_style:
            # Soft warning - don't fail validation but log
            print(f"[VALIDATION WARNING] Easy question may not be definition-style: {question_text[:50]}")
    
    elif difficulty == "moderate":
        if segment != "MCQ":
            return False, f"Moderate questions must be MCQ segment, got {segment}"
        
        if reasoning_required:
            return False, "Moderate questions should not require reasoning (use hard for that)"
        
        # Check for application/scenario style (basic check)
        application_keywords = ["how", "why", "when would", "scenario", "apply", "use"]
        is_application_style = any(keyword in question_text.lower() for keyword in application_keywords)
        
        if not is_application_style:
            print(f"[VALIDATION WARNING] Moderate question may not be application-based: {question_text[:50]}")
    
    elif difficulty == "hard":
        if segment == "MCQ_REASONING":
            # Segment A: MCQ + Reasoning required
            if not reasoning_required:
                return False, "Hard MCQ_REASONING segment must require reasoning"
            
            # Should have standard 4 options
            if len(options) != 4:
                return False, "MCQ_REASONING must have exactly 4 options"
        
        elif segment == "ASSERTION_REASON":
            # Segment B: Assertion-Reasoning format
            if reasoning_required:
                return False, "ASSERTION_REASON questions should not require additional reasoning"
            
            # Check for assertion/reason structure
            has_assertion = "assertion" in question_text.lower() or "assertion (a)" in question_text.lower()
            has_reason = "reason" in question_text.lower() or "reason (r)" in question_text.lower()
            
            if not (has_assertion and has_reason):
                return False, "ASSERTION_REASON must contain both Assertion and Reason statements"
            
            # Validate options follow A-R format
            required_ar_keywords = [
                "both a and r are true",
                "correct explanation",
                "a is true",
                "a is false"
            ]
            
            options_text = " ".join([opt.lower() for opt in options])
            ar_match_count = sum(1 for keyword in required_ar_keywords if keyword in options_text)
            
            if ar_match_count < 2:
                return False, "ASSERTION_REASON options must follow standard A-R format"
        
        else:
            return False, f"Hard difficulty must use MCQ_REASONING or ASSERTION_REASON segment, got {segment}"
    
    else:
        return False, f"Invalid difficulty level: {difficulty}. Must be easy, moderate, or hard"
    
    # All validations passed
    return True, None


def auto_fix_question(question: Dict[str, Any]) -> Dict[str, Any]:
    """
    Attempt to auto-fix common validation issues.
    Returns fixed question or original if cannot fix.
    """
    
    # Fix option labeling if missing
    options = question.get("options", [])
    labels = ["A)", "B)", "C)", "D)"]
    
    fixed_options = []
    for i, option in enumerate(options[:4]):  # Ensure only 4 options
        opt_text = option.strip()
        # Remove existing label if present
        opt_text = re.sub(r'^[A-D]\)\s*', '', opt_text)
        # Add correct label
        fixed_options.append(f"{labels[i]} {opt_text}")
    
    question["options"] = fixed_options
    
    # Normalize correct_answer
    if "correct_answer" in question:
        answer = question["correct_answer"].strip().upper()
        # Extract just the letter
        match = re.match(r'^([A-D])', answer)
        if match:
            question["correct_answer"] = match.group(1)
    
    # Set segment based on difficulty if missing
    difficulty = question.get("difficulty", "moderate").lower()
    if "segment" not in question:
        if difficulty == "easy":
            question["segment"] = "MCQ"
        elif difficulty == "moderate":
            question["segment"] = "MCQ"
        elif difficulty == "hard":
            # Default to MCQ_REASONING for hard if not specified
            question["segment"] = "MCQ_REASONING"
    
    # Set reasoning_required based on segment
    segment = question.get("segment", "MCQ")
    question["reasoning_required"] = (segment == "MCQ_REASONING")
    
    return question


def validate_and_fix_question(question: Dict[str, Any]) -> tuple[bool, Dict[str, Any], Optional[str]]:
    """
    Validate and attempt to auto-fix a question.
    
    Returns: (is_valid, fixed_question, error_message)
    """
    
    # First attempt auto-fix
    fixed_question = auto_fix_question(question.copy())
    
    # Then validate
    is_valid, error = validate_question(fixed_question)
    
    return is_valid, fixed_question, error
