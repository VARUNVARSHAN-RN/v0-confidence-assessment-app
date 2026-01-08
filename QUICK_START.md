# Quick Start Guide - Difficulty-Based Assessment System

## 🚀 Running the Application

### 1. Start the Backend (Flask)

```powershell
cd backend
python -m app.main
```

Backend will run on: `http://127.0.0.1:5000`

### 2. Start the Frontend (Next.js)

```powershell
# In a new terminal, from project root
npm run dev
```

Frontend will run on: `http://localhost:3000`

---

## 📋 Testing the New Features

### Test Flow 1: PDF-Based Assessment

1. **Navigate to**: `http://localhost:3000/start`
2. **Click**: "Upload PDF & Start" button
3. **Upload**: Any PDF document
4. **View**: AI-extracted topics and concepts
5. **Click**: "🧠 Test My Confidence" button
6. **Select**: Difficulty level (Easy/Moderate/Hard)
7. **Answer**: Questions (format varies by difficulty)
8. **View**: Difficulty-aware results with:
   - Separate scores for Easy/Moderate/Hard
   - Concept mastery breakdown
   - Understanding level (Job-Ready/Improving/Beginner)
   - Personalized recommendations

### Test Flow 2: Domain-Based Assessment

1. **Navigate to**: `http://localhost:3000/start`
2. **Select**: Core domain (or enter custom domain)
3. **Select**: Difficulty level
4. **Click**: "Start Assessment"
5. **Answer**: Questions (format varies by difficulty)
6. **View**: Same difficulty-aware results as PDF flow

---

## 🎯 Key Testing Points

### Easy Difficulty:
✅ All questions are MCQ with 4 options
✅ No reasoning input required
✅ Questions focus on definitions and basic concepts

### Moderate Difficulty:
✅ All questions are MCQ with 4 options
✅ No reasoning input required
✅ Questions involve application and scenarios

### Hard Difficulty:
✅ Questions alternate between two segments:
   - **Odd questions (1, 3, 5...)**: MCQ + Reasoning explanation required
   - **Even questions (2, 4, 6...)**: Assertion-Reasoning format
✅ Reasoning textarea appears for MCQ_REASONING questions
✅ Validation enforces strict alternation

### Results Page:
✅ Shows "Understanding Level" badge (Job-Ready/Improving/Beginner)
✅ Displays three difficulty cards with separate scores
✅ Shows concept mastery with Easy/Moderate/Hard breakdown
✅ Provides performance interpretation
✅ Lists 3 personalized recommendations

---

## 🔧 Backend API Endpoints

### New/Modified Endpoints:

**POST `/api/assessment/ingest`**
- Upload PDF for content analysis
- Returns topics and concepts
- Used by: [app/upload/page.tsx](app/upload/page.tsx)

**POST `/api/assessment/generate-batch`**
- Generates batch of questions
- Accepts: `{ domain, count, difficulty }`
- Returns: `{ session_id, questions[] }`
- Enforces difficulty-specific rules
- Validates questions before returning

---

## 📝 Sample Test Data

### Easy Question Example:
```json
{
  "question": "What is polymorphism in object-oriented programming?",
  "options": [
    "A) The ability to take multiple forms",
    "B) The ability to inherit from multiple classes",
    "C) The ability to encapsulate data",
    "D) The ability to override methods"
  ],
  "correct_answer": "A",
  "difficulty": "easy",
  "segment": "MCQ",
  "reasoning_required": false
}
```

### Moderate Question Example:
```json
{
  "question": "When would you use polymorphism instead of simple inheritance?",
  "options": [
    "A) When you need different behaviors for the same method call",
    "B) When you want to hide implementation details",
    "C) When you need to create multiple objects",
    "D) When you want to prevent inheritance"
  ],
  "correct_answer": "A",
  "difficulty": "moderate",
  "segment": "MCQ",
  "reasoning_required": false
}
```

### Hard Question Example (MCQ_REASONING):
```json
{
  "question": "Analyze the following code. Why would using polymorphism improve this design?",
  "options": [
    "A) It reduces code duplication and enables runtime flexibility",
    "B) It makes the code run faster",
    "C) It prevents memory leaks",
    "D) It eliminates the need for interfaces"
  ],
  "correct_answer": "A",
  "difficulty": "hard",
  "segment": "MCQ_REASONING",
  "reasoning_required": true
}
```

### Hard Question Example (ASSERTION_REASON):
```json
{
  "question": "Assertion (A): Polymorphism allows method overriding.\n\nReason (R): Subclasses can provide specific implementations of methods defined in parent classes.",
  "options": [
    "A) Both A and R are true, and R is the correct explanation of A",
    "B) Both A and R are true, but R is NOT the correct explanation of A",
    "C) A is true, but R is false",
    "D) A is false, but R is true"
  ],
  "correct_answer": "A",
  "difficulty": "hard",
  "segment": "ASSERTION_REASON",
  "reasoning_required": false
}
```

---

## 🎨 UI Navigation Map

```
/start (Start Page)
  ├─→ /upload (PDF Upload) [NEW]
  │     └─→ /select-difficulty [NEW]
  │           └─→ /assessment
  │                 └─→ /results/[sessionId]
  │
  └─→ /assessment (Direct domain-based)
        └─→ /results/[sessionId]
```

---

## 🐛 Troubleshooting

### Issue: "No questions generated"
**Solution**: Ensure backend is running and Gemini API key is configured

### Issue: "Validation failed"
**Solution**: Backend will auto-regenerate. Check console for validation errors

### Issue: "Reasoning input not appearing"
**Solution**: Verify question has `reasoning_required: true` in hard difficulty

### Issue: "Results page shows 0%"
**Solution**: Ensure at least one question was answered

### Issue: "PDF upload fails"
**Solution**: Check PDF file size (<10MB) and ensure backend `/ingest` endpoint is accessible

---

## ✅ Verification Checklist

Before reporting completion, verify:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can upload PDF and see summary
- [ ] "Test My Confidence" button works
- [ ] Difficulty selection page displays correctly
- [ ] Easy questions are all MCQ format
- [ ] Moderate questions are application-based MCQs
- [ ] Hard questions alternate between MCQ_REASONING and ASSERTION_REASON
- [ ] Reasoning textarea appears for MCQ_REASONING questions
- [ ] Results page shows difficulty-wise breakdown
- [ ] Concept mastery section displays
- [ ] Recommendations appear
- [ ] Understanding level badge shows correct status
- [ ] No console errors in browser or terminal

---

## 📚 Documentation

- **Full Implementation**: [DIFFICULTY_IMPLEMENTATION.md](DIFFICULTY_IMPLEMENTATION.md)
- **Question Categorization**: [QUESTION_CATEGORIZATION.md](QUESTION_CATEGORIZATION.md)
- **Original Setup**: [SETUP.md](SETUP.md)
- **Extension Summary**: [EXTENSION_SUMMARY.md](EXTENSION_SUMMARY.md)

---

## 🎉 Success Indicators

The system is working correctly when you see:
1. ✅ PDF summary displays topics and concepts
2. ✅ Difficulty cards are visually distinct and selectable
3. ✅ Hard questions show reasoning input on odd-numbered questions
4. ✅ Results page shows three separate difficulty scores
5. ✅ Concept mastery uses weighted formula (Easy 30%, Moderate 40%, Hard 30%)
6. ✅ Understanding level matches performance pattern
7. ✅ Recommendations are specific and actionable

---

**Ready to test!** 🚀
