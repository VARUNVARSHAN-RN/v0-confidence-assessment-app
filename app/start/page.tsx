"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CORE_DOMAINS = [
  { value: "machine-learning", label: "Machine Learning" },
  { value: "data-science", label: "Data Science" },
  { value: "operating-systems", label: "Operating Systems" },
  { value: "web-development", label: "Web Development" },
  { value: "computer-networks", label: "Computer Networks" },
  { value: "others", label: "Others (Custom Domain)" },
]

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy - Basic Concepts & Definitions" },
  { value: "moderate", label: "Moderate - Application & Real-World Usage" },
  { value: "hard", label: "Hard - Deep Reasoning & Interview-Level" },
]

export default function StartAssessmentPage() {
  const router = useRouter()
  const [selectedDomain, setSelectedDomain] = useState<string>("")
  const [customDomain, setCustomDomain] = useState<string>("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleStartAssessment = async () => {
    // Determine the actual domain to use (custom or selected)
    const domainToUse = selectedDomain === "others" ? customDomain : selectedDomain
    
    if (!domainToUse || !selectedDifficulty) return

    setIsLoading(true)

    try {
      // Store domain and difficulty in sessionStorage
      sessionStorage.setItem("assessment_domain", domainToUse)
      sessionStorage.setItem("assessment_difficulty", selectedDifficulty)
      
      // Navigate to assessment page
      router.push(`/assessment?domain=${encodeURIComponent(domainToUse)}&difficulty=${selectedDifficulty}`)
    } catch (error) {
      console.error("Failed to start assessment:", error)
      setIsLoading(false)
    }
  }

  // Determine if the "Start Assessment" button should be disabled
  const isReadyToStart = selectedDomain && selectedDifficulty && 
    (selectedDomain !== "others" || (selectedDomain === "others" && customDomain.trim() !== ""))

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-sky-50 px-6 py-20">
      <Card className="w-full max-w-3xl shadow-2xl border border-blue-100 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="space-y-6 pt-14 pb-10 px-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600">
          <CardTitle className="text-4xl md:text-5xl font-semibold text-center text-white leading-tight tracking-wide">
            AI-Based Confidence Assessment
          </CardTitle>
          <CardDescription className="text-center text-lg md:text-xl text-white/90 font-normal leading-relaxed max-w-2xl mx-auto">
            Evaluate your conceptual mastery, reasoning depth, and confidence alignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-10 p-12 md:p-14 bg-white">
          {/* PDF Upload Option */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
            <h3 className="text-2xl font-bold text-purple-700 mb-3">📄 Document-Based Assessment</h3>
            <p className="text-gray-700 mb-6">
              Upload a PDF document to analyze its content and test your understanding with AI-generated questions
            </p>
            <Button
              onClick={() => router.push('/upload')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
            >
              Upload PDF & Start
            </Button>
          </div>

          <div className="text-center text-gray-500 font-medium">
            — OR —
          </div>

          {/* Domain Selection */}
          <div className="space-y-9">
          <div className="space-y-4">
              <label className="block text-base font-medium text-gray-700 tracking-wide">
                Step 1: Select Core Domain
              </label>
              <Select value={selectedDomain} onValueChange={(value) => {
                setSelectedDomain(value)
                if (value !== "others") {
                  setCustomDomain("")
                }
              }}>
                <SelectTrigger className="w-full h-16 text-lg rounded-[18px] border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white hover:bg-blue-50/30 shadow-sm hover:shadow-md">
                  <SelectValue placeholder="Choose a domain to assess..." />
                </SelectTrigger>
                <SelectContent className="rounded-[18px] border-2 border-blue-100 shadow-2xl bg-white">
                  {CORE_DOMAINS.map((domain) => (
                    <SelectItem 
                      key={domain.value} 
                      value={domain.value} 
                      className="text-base py-3 px-4 rounded-lg cursor-pointer transition-colors text-gray-900 font-medium data-[highlighted]:bg-blue-200 data-[highlighted]:text-gray-900"
                    >
                      {domain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Domain Input - Show only when "Others" is selected */}
              {selectedDomain === "others" && (
                <div className="mt-4 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Enter your domain (e.g., Blockchain, Cybersecurity)"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full h-14 px-5 text-base rounded-[18px] border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white hover:bg-blue-50/30 shadow-sm placeholder-gray-400 text-gray-900 font-medium"
                  />
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    Enter a custom domain to assess your knowledge in a specific area
                  </p>
                </div>
              )}
            </div>

            {/* Difficulty Selection - Only show if domain is selected */}
            {selectedDomain && (
              <div className="space-y-4 animate-fadeIn">
                <label className="block text-base font-medium text-gray-700 tracking-wide">
                  Step 2: Select Difficulty Level
                </label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-full h-16 text-lg rounded-[18px] border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white hover:bg-blue-50/30 shadow-sm hover:shadow-md">
                    <SelectValue placeholder="Choose difficulty level..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-[18px] border-2 border-blue-100 shadow-2xl bg-white">
                    {DIFFICULTY_LEVELS.map((level) => (
                      <SelectItem 
                        key={level.value} 
                        value={level.value} 
                        className="text-base py-3 px-4 rounded-lg cursor-pointer transition-colors text-gray-900 font-medium data-[highlighted]:bg-blue-200 data-[highlighted]:text-gray-900"
                      >
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-[20px] p-7 space-y-3 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-900">Assessment Details:</h3>
              <ul className="text-base text-blue-800 space-y-2.5 list-none">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                  <span className="leading-relaxed">10 dynamically generated questions using AI</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                  <span className="leading-relaxed">Difficulty-adapted prompts for your level</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                  <span className="leading-relaxed">Behavioral feature extraction during answering</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                  <span className="leading-relaxed">ML-based multi-dimensional confidence analysis</span>
                </li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleStartAssessment}
            disabled={!isReadyToStart || isLoading}
            className="w-full h-16 text-lg font-semibold bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 rounded-[18px] shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-white"
          >
            {isLoading ? "Preparing Assessment..." : "Start Assessment"}
          </Button>

          <p className="text-sm text-center text-gray-500 leading-relaxed px-4">
            This system evaluates conceptual clarity, logical reasoning, and application confidence—not just correctness.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
