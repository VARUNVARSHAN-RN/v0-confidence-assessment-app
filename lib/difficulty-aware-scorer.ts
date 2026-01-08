/**
 * Difficulty-Aware Scoring System
 * 
 * Implements comprehensive scoring based on difficulty levels:
 * - Easy: Foundation testing (definitions, terminology)
 * - Moderate: Conceptual application
 * - Hard: Deep reasoning and industry readiness
 */

import type { QuestionResponse, Question } from "./assessment-context"

export interface DifficultyScore {
  difficulty: "easy" | "moderate" | "hard"
  total_questions: number
  correct: number
  accuracy: number // percentage
  avg_confidence: number
  avg_time: number
}

export interface ConceptMastery {
  concept: string
  easy_score: number
  moderate_score: number
  hard_score: number
  overall_score: number
  status: "mastered" | "partially-understood" | "needs-revision"
  question_count: number
}

export interface DifficultyAwareAnalytics {
  // Difficulty-wise breakdown
  easy: DifficultyScore
  moderate: DifficultyScore
  hard: DifficultyScore
  
  // Concept-wise mastery
  concept_mastery: ConceptMastery[]
  
  // Overall metrics
  overall_confidence_score: number // weighted formula
  overall_accuracy: number
  overall_understanding_level: "job-ready" | "improving" | "beginner"
  
  // Consistency metrics
  accuracy_consistency: number
  time_consistency: number
  confidence_alignment: number // how well confidence matches correctness
  
  // Interpretation
  interpretation: string
  recommendations: string[]
}

/**
 * Compute difficulty-wise scores
 */
export function computeDifficultyScores(
  responses: QuestionResponse[],
  questions: Question[]
): Record<string, DifficultyScore> {
  const scores: Record<string, DifficultyScore> = {
    easy: {
      difficulty: "easy",
      total_questions: 0,
      correct: 0,
      accuracy: 0,
      avg_confidence: 0,
      avg_time: 0,
    },
    moderate: {
      difficulty: "moderate",
      total_questions: 0,
      correct: 0,
      accuracy: 0,
      avg_confidence: 0,
      avg_time: 0,
    },
    hard: {
      difficulty: "hard",
      total_questions: 0,
      correct: 0,
      accuracy: 0,
      avg_confidence: 0,
      avg_time: 0,
    },
  }

  // Group responses by difficulty
  responses.forEach((response, idx) => {
    const question = questions[idx]
    if (!question) return

    const difficulty = question.difficulty.toLowerCase() as "easy" | "moderate" | "hard"
    const score = scores[difficulty]

    score.total_questions++
    if (response.is_correct) score.correct++
    score.avg_confidence += response.user_confidence
    score.avg_time += response.total_time
  })

  // Calculate averages and percentages
  Object.values(scores).forEach((score) => {
    if (score.total_questions > 0) {
      score.accuracy = (score.correct / score.total_questions) * 100
      score.avg_confidence = score.avg_confidence / score.total_questions
      score.avg_time = score.avg_time / score.total_questions
    }
  })

  return scores
}

/**
 * Compute concept-wise mastery scores
 */
export function computeConceptMastery(
  responses: QuestionResponse[],
  questions: Question[]
): ConceptMastery[] {
  const conceptMap = new Map<string, {
    easy: { correct: number; total: number },
    moderate: { correct: number; total: number },
    hard: { correct: number; total: number },
  }>()

  // Group by concept and difficulty
  responses.forEach((response, idx) => {
    const question = questions[idx]
    if (!question) return

    const concept = question.topic
    const difficulty = question.difficulty.toLowerCase() as "easy" | "moderate" | "hard"

    if (!conceptMap.has(concept)) {
      conceptMap.set(concept, {
        easy: { correct: 0, total: 0 },
        moderate: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 },
      })
    }

    const conceptData = conceptMap.get(concept)!
    conceptData[difficulty].total++
    if (response.is_correct) {
      conceptData[difficulty].correct++
    }
  })

  // Calculate mastery scores
  const masteryList: ConceptMastery[] = []

  conceptMap.forEach((data, concept) => {
    const easyScore = data.easy.total > 0 ? (data.easy.correct / data.easy.total) * 100 : 0
    const moderateScore = data.moderate.total > 0 ? (data.moderate.correct / data.moderate.total) * 100 : 0
    const hardScore = data.hard.total > 0 ? (data.hard.correct / data.hard.total) * 100 : 0

    // Weighted overall: Easy 30%, Moderate 40%, Hard 30%
    const totalQuestions = data.easy.total + data.moderate.total + data.hard.total
    const overallScore = (easyScore * 0.3 + moderateScore * 0.4 + hardScore * 0.3)

    let status: "mastered" | "partially-understood" | "needs-revision"
    if (overallScore >= 80) {
      status = "mastered"
    } else if (overallScore >= 50) {
      status = "partially-understood"
    } else {
      status = "needs-revision"
    }

    masteryList.push({
      concept,
      easy_score: easyScore,
      moderate_score: moderateScore,
      hard_score: hardScore,
      overall_score: overallScore,
      status,
      question_count: totalQuestions,
    })
  })

  return masteryList.sort((a, b) => b.overall_score - a.overall_score)
}

/**
 * Compute overall confidence score using weighted formula
 */
export function computeOverallConfidenceScore(
  responses: QuestionResponse[],
  difficultyScores: Record<string, DifficultyScore>
): number {
  if (responses.length === 0) return 0

  // Overall accuracy
  const totalCorrect = responses.filter((r) => r.is_correct).length
  const accuracy = (totalCorrect / responses.length) * 100

  // Consistency: standard deviation of correctness pattern
  const correctnessValues = responses.map((r) => (r.is_correct ? 1 : 0))
  const avgCorrectness = correctnessValues.reduce((a: number, b) => a + b, 0) / correctnessValues.length
  const variance = correctnessValues.reduce((acc: number, val) => acc + Math.pow(val - avgCorrectness, 2), 0) / correctnessValues.length
  const consistency = Math.max(0, 100 - Math.sqrt(variance) * 100)

  // Response speed: normalize to 0-100 (lower time = higher score)
  const avgTime = responses.reduce((sum, r) => sum + r.total_time, 0) / responses.length
  const speedScore = Math.max(0, 100 - (avgTime / 120) * 100) // 120s = baseline

  // Confidence Score Formula (from requirements)
  // Confidence_Score = (Accuracy × 0.6) + (Consistency × 0.25) + (Response_Speed × 0.15)
  const confidenceScore = accuracy * 0.6 + consistency * 0.25 + speedScore * 0.15

  return Math.round(confidenceScore)
}

/**
 * Determine overall understanding level
 */
export function determineUnderstandingLevel(
  difficultyScores: Record<string, DifficultyScore>
): "job-ready" | "improving" | "beginner" {
  const easyAccuracy = difficultyScores.easy.accuracy
  const moderateAccuracy = difficultyScores.moderate.accuracy
  const hardAccuracy = difficultyScores.hard.accuracy

  // Job-Ready: Easy ≥ 80 AND Moderate ≥ 70 AND Hard ≥ 60
  if (easyAccuracy >= 80 && moderateAccuracy >= 70 && hardAccuracy >= 60) {
    return "job-ready"
  }

  // Improving: Easy ≥ 70 AND Moderate ≥ 60
  if (easyAccuracy >= 70 && moderateAccuracy >= 60) {
    return "improving"
  }

  // Beginner: Otherwise
  return "beginner"
}

/**
 * Generate interpretation based on difficulty pattern
 */
export function generateInterpretation(
  difficultyScores: Record<string, DifficultyScore>
): string {
  const easyAccuracy = difficultyScores.easy.accuracy
  const moderateAccuracy = difficultyScores.moderate.accuracy
  const hardAccuracy = difficultyScores.hard.accuracy

  // High across all
  if (easyAccuracy >= 80 && moderateAccuracy >= 80 && hardAccuracy >= 70) {
    return "Industry-ready understanding with strong foundation and application skills."
  }

  // High Easy + Low Moderate
  if (easyAccuracy >= 75 && moderateAccuracy < 60) {
    return "Basics clear, but concepts need more work. Focus on practical application."
  }

  // High Moderate + Low Hard
  if (moderateAccuracy >= 75 && hardAccuracy < 50) {
    return "Conceptually strong, but lacks deep application experience. Practice complex scenarios."
  }

  // Balanced but moderate
  if (easyAccuracy >= 60 && moderateAccuracy >= 60 && hardAccuracy >= 50) {
    return "Solid foundational understanding with room for refinement in advanced topics."
  }

  // Low overall
  if (easyAccuracy < 50 || moderateAccuracy < 50) {
    return "Foundation needs strengthening. Review core concepts before advancing."
  }

  return "Developing understanding across difficulty levels. Consistent practice will build mastery."
}

/**
 * Generate personalized recommendations
 */
export function generateRecommendations(
  difficultyScores: Record<string, DifficultyScore>,
  conceptMastery: ConceptMastery[]
): string[] {
  const recommendations: string[] = []
  const easyAccuracy = difficultyScores.easy.accuracy
  const moderateAccuracy = difficultyScores.moderate.accuracy
  const hardAccuracy = difficultyScores.hard.accuracy

  // Difficulty-based recommendations
  if (hardAccuracy < 60) {
    recommendations.push(
      "Practice complex problem-solving and multi-step reasoning to strengthen Hard-level performance."
    )
  }

  if (moderateAccuracy < 60) {
    recommendations.push(
      "Reinforce conceptual learning by working through more application-based scenarios."
    )
  }

  if (easyAccuracy < 70) {
    recommendations.push(
      "Review fundamental definitions and terminology to solidify your foundation."
    )
  }

  // Concept-specific recommendations
  const weakConcepts = conceptMastery.filter((c) => c.status === "needs-revision")
  if (weakConcepts.length > 0) {
    const topWeak = weakConcepts.slice(0, 2).map((c) => c.concept).join(", ")
    recommendations.push(
      `Focus revision efforts on: ${topWeak}. These concepts require more attention.`
    )
  }

  // Confidence alignment recommendation
  const avgConfidence = (difficultyScores.easy.avg_confidence + difficultyScores.moderate.avg_confidence + difficultyScores.hard.avg_confidence) / 3
  const avgAccuracy = (easyAccuracy + moderateAccuracy + hardAccuracy) / 3
  
  if (avgConfidence > avgAccuracy + 20) {
    recommendations.push(
      "Work on self-assessment calibration. Your confidence often exceeds your accuracy."
    )
  } else if (avgAccuracy > avgConfidence + 20) {
    recommendations.push(
      "Build confidence in your knowledge. You're performing better than you think!"
    )
  }

  // Default recommendation if doing well
  if (recommendations.length === 0) {
    recommendations.push(
      "Excellent performance! Continue practicing advanced topics to maintain mastery."
    )
  }

  return recommendations.slice(0, 3) // Max 3 recommendations
}

/**
 * Main analytics function
 */
export function computeDifficultyAwareAnalytics(
  responses: QuestionResponse[],
  questions: Question[]
): DifficultyAwareAnalytics {
  const difficultyScores = computeDifficultyScores(responses, questions)
  const conceptMastery = computeConceptMastery(responses, questions)
  const overallConfidenceScore = computeOverallConfidenceScore(responses, difficultyScores)
  const understandingLevel = determineUnderstandingLevel(difficultyScores)
  const interpretation = generateInterpretation(difficultyScores)
  const recommendations = generateRecommendations(difficultyScores, conceptMastery)

  // Overall accuracy
  const totalCorrect = responses.filter((r) => r.is_correct).length
  const overallAccuracy = responses.length > 0 ? (totalCorrect / responses.length) * 100 : 0

  // Consistency metrics
  const accuracyConsistency = 100 - (Math.max(
    difficultyScores.easy.accuracy,
    difficultyScores.moderate.accuracy,
    difficultyScores.hard.accuracy
  ) - Math.min(
    difficultyScores.easy.accuracy,
    difficultyScores.moderate.accuracy,
    difficultyScores.hard.accuracy
  ))

  const timeConsistency = 100 - Math.min(100, (
    Math.abs(difficultyScores.easy.avg_time - difficultyScores.moderate.avg_time) +
    Math.abs(difficultyScores.moderate.avg_time - difficultyScores.hard.avg_time)
  ) / 2)

  // Confidence alignment: how well self-confidence matches actual performance
  const confidenceAlignment = responses.reduce((sum, r) => {
    const expectedConfidence = r.is_correct ? 80 : 40
    const diff = Math.abs(r.user_confidence - expectedConfidence)
    return sum + (100 - diff)
  }, 0) / responses.length

  return {
    easy: difficultyScores.easy,
    moderate: difficultyScores.moderate,
    hard: difficultyScores.hard,
    concept_mastery: conceptMastery,
    overall_confidence_score: overallConfidenceScore,
    overall_accuracy: Math.round(overallAccuracy),
    overall_understanding_level: understandingLevel,
    accuracy_consistency: Math.round(accuracyConsistency),
    time_consistency: Math.round(timeConsistency),
    confidence_alignment: Math.round(confidenceAlignment),
    interpretation,
    recommendations,
  }
}
