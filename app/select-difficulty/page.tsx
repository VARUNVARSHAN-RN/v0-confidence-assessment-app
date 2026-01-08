"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Sparkles, Target, Zap } from "lucide-react"

type DifficultyLevel = "easy" | "moderate" | "hard"

interface DifficultyOption {
  id: DifficultyLevel
  title: string
  subtitle: string
  description: string
  icon: React.ReactNode
  color: string
  borderColor: string
  hoverBg: string
  iconBg: string
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    id: "easy",
    title: "Easy",
    subtitle: "Foundation Builder",
    description: "Multiple choice questions testing surface-level understanding. Focus on definitions, terminology, and basic concepts from the document.",
    icon: <Brain className="w-10 h-10" />,
    color: "text-green-700",
    borderColor: "border-green-300 hover:border-green-500",
    hoverBg: "hover:bg-green-50",
    iconBg: "bg-green-100",
  },
  {
    id: "moderate",
    title: "Moderate",
    subtitle: "Concept Application",
    description: "Application-based multiple choice questions. Requires understanding concepts and applying them to real-world scenarios.",
    icon: <Target className="w-10 h-10" />,
    color: "text-blue-700",
    borderColor: "border-blue-300 hover:border-blue-500",
    hoverBg: "hover:bg-blue-50",
    iconBg: "bg-blue-100",
  },
  {
    id: "hard",
    title: "Hard",
    subtitle: "Industry Readiness",
    description: "Complex questions with reasoning explanations and assertion-reasoning formats. Tests deep understanding, multi-step thinking, and case-based analysis.",
    icon: <Zap className="w-10 h-10" />,
    color: "text-purple-700",
    borderColor: "border-purple-300 hover:border-purple-500",
    hoverBg: "hover:bg-purple-50",
    iconBg: "bg-purple-100",
  },
]

export default function SelectDifficultyPage() {
  const router = useRouter()
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)

  const handleStartAssessment = () => {
    if (!selectedDifficulty) {
      alert("Please select a difficulty level")
      return
    }

    // Check if PDF content is available
    const pdfContent = sessionStorage.getItem("pdf_content")
    
    if (!pdfContent) {
      // No PDF uploaded, use domain-based assessment
      sessionStorage.setItem("assessment_difficulty", selectedDifficulty)
      router.push("/start")
      return
    }

    // PDF uploaded - proceed with PDF-based assessment
    const content = JSON.parse(pdfContent)
    const domain = content.topics?.[0] || "Document Analysis"
    
    sessionStorage.setItem("assessment_domain", domain)
    sessionStorage.setItem("assessment_difficulty", selectedDifficulty)
    sessionStorage.setItem("assessment_mode", "pdf")
    
    router.push(`/assessment?domain=${encodeURIComponent(domain)}&difficulty=${selectedDifficulty}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-50 px-6 py-20">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Select Difficulty Level
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Choose the assessment difficulty that matches your learning goals. Each level has strict question formats and scoring criteria.
          </p>
        </div>

        {/* Difficulty Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = selectedDifficulty === option.id
            return (
              <Card
                key={option.id}
                onClick={() => setSelectedDifficulty(option.id)}
                className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                  isSelected
                    ? "border-4 border-blue-600 shadow-2xl scale-105"
                    : `border-2 ${option.borderColor} ${option.hoverBg}`
                }`}
              >
                <CardHeader className="space-y-4 pb-4">
                  <div className={`w-16 h-16 ${option.iconBg} rounded-2xl flex items-center justify-center ${option.color} mx-auto`}>
                    {option.icon}
                  </div>
                  <CardTitle className="text-center">
                    <div className={`text-2xl font-bold ${option.color}`}>
                      {option.title}
                    </div>
                    <div className="text-sm text-gray-600 font-normal mt-1">
                      {option.subtitle}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 text-center leading-relaxed min-h-[120px]">
                    {option.description}
                  </p>
                  
                  {/* Format Details */}
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Question Format:
                    </p>
                    {option.id === "easy" && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Multiple Choice (4 options)</li>
                        <li>• Single correct answer</li>
                        <li>• No reasoning required</li>
                      </ul>
                    )}
                    {option.id === "moderate" && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Application-based MCQs</li>
                        <li>• 4 options per question</li>
                        <li>• Conceptual thinking</li>
                      </ul>
                    )}
                    {option.id === "hard" && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• MCQ + Reasoning explanation</li>
                        <li>• Assertion-Reasoning format</li>
                        <li>• Alternating segments</li>
                      </ul>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="pt-3">
                      <div className="bg-blue-600 text-white text-center py-2 rounded-lg font-semibold text-sm">
                        ✓ Selected
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-4 pt-6">
          <Button
            onClick={handleStartAssessment}
            disabled={!selectedDifficulty}
            className="h-16 px-12 text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Assessment
          </Button>
          {!selectedDifficulty && (
            <p className="text-sm text-gray-500">
              Please select a difficulty level to continue
            </p>
          )}
        </div>

        {/* Info Panel */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Understanding Difficulty Levels
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Easy:</strong> Best for verifying basic comprehension and terminology mastery.
              </p>
              <p>
                <strong>Moderate:</strong> Tests your ability to apply concepts in practical scenarios.
              </p>
              <p>
                <strong>Hard:</strong> Evaluates deep reasoning, critical thinking, and industry-level problem solving.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
