"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Brain, Loader2 } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000"

interface Concept {
  title: string
  content: string
  summary?: string
}

interface PDFSummary {
  topics: string[]
  concepts: Concept[]
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
        setSummary({
          topics: data.topics || [],
          concepts: data.concepts || [],
        })
        
        // Store PDF content in session for question generation
        sessionStorage.setItem("pdf_content", JSON.stringify(data))
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-sky-50 px-6 py-20">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-xl border border-blue-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="space-y-4 pt-12 pb-8 px-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600">
            <CardTitle className="text-4xl md:text-5xl font-semibold text-center text-white leading-tight tracking-wide">
              Document-Based Assessment
            </CardTitle>
            <p className="text-center text-lg text-white/90 font-normal leading-relaxed max-w-2xl mx-auto">
              Upload your PDF to analyze concepts and test your understanding with AI-generated questions
            </p>
          </CardHeader>
          <CardContent className="p-12">
            {!summary ? (
              <div className="space-y-6">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center hover:border-blue-500 transition-colors bg-blue-50/30">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Upload Your PDF Document
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We'll analyze the content and generate personalized assessment questions
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold cursor-pointer hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Choose PDF File
                    </label>
                    {file && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                    {error}
                  </div>
                )}

                {file && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
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
              <div className="space-y-6">
                {/* Document Summary */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    Document Summary
                  </h2>
                  
                  {/* Topics */}
                  {summary.topics.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-800 mb-3">Key Topics Identified:</h3>
                      <div className="flex flex-wrap gap-2">
                        {summary.topics.map((topic, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concepts */}
                  {summary.concepts.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-800">Concepts Extracted:</h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {summary.concepts.slice(0, 5).map((concept, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                          >
                            <h4 className="font-semibold text-blue-700 mb-2">{concept.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {concept.summary || concept.content.substring(0, 200) + "..."}
                            </p>
                          </div>
                        ))}
                      </div>
                      {summary.concepts.length > 5 && (
                        <p className="text-sm text-gray-500 text-center">
                          ...and {summary.concepts.length - 5} more concepts
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Test My Confidence Button */}
                <div className="pt-6 border-t border-gray-200">
                  <Button
                    onClick={handleTestConfidence}
                    className="w-full h-16 text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <Brain className="w-7 h-7 mr-3" />
                    Test My Confidence
                  </Button>
                  <p className="text-center text-sm text-gray-600 mt-3">
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
                  className="w-full"
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
