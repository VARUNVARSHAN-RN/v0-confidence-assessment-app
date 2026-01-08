"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Brain, Loader2 } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000"

interface MainTopic {
  name: string
  description: string
  key_points?: string[]
}

interface PDFSummary {
  title?: string
  overview?: string
  key_concepts?: string[]
  main_topics?: MainTopic[]
  difficulty_level?: string
  estimated_read_time_minutes?: number
  // legacy fields (fallback if backend returns old shape)
  topics?: string[]
  concepts?: { title: string; content: string; summary?: string }[]
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [summary, setSummary] = useState<PDFSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Please select a valid PDF file")
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first")
      return
    }

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("pdf", file)

    try {
      const response = await fetch(`${BACKEND_URL}/api/assessment/ingest`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process PDF")
      }

      const data = await response.json()
      
      if (data.success) {
        const summaryPayload: PDFSummary = {
          title: data.summary?.title || data.title,
          overview: data.summary?.overview || data.overview,
          key_concepts: data.summary?.key_concepts || data.key_concepts || data.topics,
          main_topics: data.summary?.main_topics || data.main_topics,
          difficulty_level: data.summary?.difficulty_level || data.difficulty_level,
          estimated_read_time_minutes:
            data.summary?.estimated_read_time_minutes || data.estimated_read_time_minutes,
          topics: data.topics || [],
          concepts: data.concepts || [],
        }

        setSummary(summaryPayload)
        // Store PDF content in session for question generation
        sessionStorage.setItem("pdf_content", JSON.stringify({ ...data, summary: summaryPayload }))
      } else {
        throw new Error(data.error || "Failed to process PDF")
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Failed to upload PDF")
    } finally {
      setIsUploading(false)
    }
  }

  const handleTestConfidence = () => {
    // Navigate to difficulty selection page
    router.push("/select-difficulty")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <Card className="shadow-2xl border-2 border-blue-200/50 rounded-2xl overflow-hidden bg-white backdrop-blur-sm">
          <CardHeader className="space-y-5 pt-14 pb-10 px-8 sm:px-12 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600">
            <CardTitle className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center text-white leading-tight tracking-tight">
              Document-Based Assessment
            </CardTitle>
            <p className="text-center text-base sm:text-lg text-white/95 font-medium leading-relaxed max-w-3xl mx-auto">
              Upload your PDF to analyze concepts and test your understanding with AI-generated questions
            </p>
          </CardHeader>
          <CardContent className="p-8 sm:p-12 lg:p-16">
            {!summary ? (
              <div className="space-y-8">
                {/* Upload Area */}
                <div className="border-3 border-dashed border-blue-400/60 rounded-3xl p-14 sm:p-16 text-center hover:border-blue-600 hover:bg-blue-50/60 transition-all duration-300 bg-blue-50/40 shadow-inner">
                  <Upload className="w-20 h-20 mx-auto mb-6 text-blue-600" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Upload Your PDF Document
                  </h3>
                  <p className="text-base text-gray-700 mb-8 max-w-md mx-auto leading-relaxed">
                    We'll analyze the content and generate personalized assessment questions
                  </p>
                  <div className="flex flex-col items-center gap-5">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700 hover:shadow-xl transition-all duration-300 shadow-lg text-base transform hover:scale-105"
                    >
                      Choose PDF File
                    </label>
                    {file && (
                      <div className="flex items-center gap-3 text-gray-800 bg-white px-6 py-3 rounded-xl border border-blue-200 shadow-md">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <span className="font-semibold text-base">{file.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-5 bg-red-50/80 border-2 border-red-300 rounded-xl text-red-800 text-center font-medium shadow-sm">
                    {error}
                  </div>
                )}

                {file && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing PDF...
                      </>
                    ) : (
                      "Analyze Document"
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Document Summary */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-blue-900 flex items-center gap-3 pb-4 border-b-2 border-blue-200">
                    <FileText className="w-8 h-8 text-blue-600" />
                    {summary.title || "Document Summary"}
                  </h2>

                  {/* Overview */}
                  {summary.overview && (
                    <div className="p-7 rounded-2xl border-2 border-blue-200/70 bg-gradient-to-br from-blue-50 to-white shadow-md hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        Overview
                      </h3>
                      <p className="text-base text-gray-800 leading-relaxed">{summary.overview}</p>
                    </div>
                  )}

                  {/* Key Concepts */}
                  {summary.key_concepts && summary.key_concepts.length > 0 && (
                    <div className="p-7 rounded-2xl border-2 border-blue-200/70 bg-gradient-to-br from-blue-50 to-white shadow-md hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-blue-800 mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        Key Concepts
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {summary.key_concepts.map((concept, idx) => (
                          <span
                            key={idx}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-base font-semibold shadow-md hover:shadow-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Topics */}
                  {summary.main_topics && summary.main_topics.length > 0 && (
                    <div className="space-y-5">
                      <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        Main Topics
                      </h3>
                      <div className="grid md:grid-cols-2 gap-5">
                        {summary.main_topics.map((topic, idx) => (
                          <div
                            key={idx}
                            className="p-6 rounded-2xl border-2 border-blue-100 bg-white shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1"
                          >
                            <div className="text-lg font-bold text-blue-700 mb-3 pb-2 border-b border-blue-100">{topic.name}</div>
                            <p className="text-sm text-gray-700 mb-4 leading-relaxed">{topic.description}</p>
                            {topic.key_points && topic.key_points.length > 0 && (
                              <ul className="text-sm text-gray-600 space-y-2 ml-1">
                                {topic.key_points.map((point, pidx) => (
                                  <li key={pidx} className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Difficulty & Read Time */}
                  {(summary.difficulty_level || summary.estimated_read_time_minutes) && (
                    <div className="flex flex-wrap gap-4 pt-4">
                      {summary.difficulty_level && (
                        <span className="px-6 py-3 rounded-xl bg-blue-100 text-blue-800 font-bold text-base border-2 border-blue-200 shadow-sm">
                          Difficulty: {summary.difficulty_level}
                        </span>
                      )}
                      {summary.estimated_read_time_minutes && (
                        <span className="px-6 py-3 rounded-xl bg-blue-100 text-blue-800 font-bold text-base border-2 border-blue-200 shadow-sm">
                          Est. Read Time: {Math.round(summary.estimated_read_time_minutes)} min
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Legacy fallback for topics/concepts if AI summary missing */}
                {!summary.main_topics && summary.topics && summary.topics.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-800">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.topics.map((topic, idx) => (
                        <span key={idx} className="px-3 py-2 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!summary.main_topics && summary.concepts && summary.concepts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-800">Concepts</h3>
                    <div className="space-y-2">
                      {summary.concepts.slice(0, 5).map((concept, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                          <div className="font-semibold text-blue-700">{concept.title}</div>
                          <p className="text-sm text-gray-600">
                            {concept.summary || concept.content.substring(0, 160) + "..."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test My Confidence Button */}
                <div className="pt-8 mt-8 border-t-2 border-blue-200">
                  <Button
                    onClick={handleTestConfidence}
                    className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <Brain className="w-9 h-9 mr-4" />
                    Test My Confidence
                  </Button>
                  <p className="text-center text-base text-gray-700 mt-4 font-medium">
                    Select difficulty level and start your personalized assessment
                  </p>
                </div>

                {/* Reset Option */}
                <Button
                  onClick={() => {
                    setSummary(null)
                    setFile(null)
                    sessionStorage.removeItem("pdf_content")
                  }}
                  variant="outline"
                  className="w-full h-14 text-base font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500 transition-all duration-200"
                >
                  Upload Different Document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
