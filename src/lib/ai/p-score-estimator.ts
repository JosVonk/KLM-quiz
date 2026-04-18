import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export async function estimatePScore(
  questionText: string,
  options: string[],
  correctAnswer: string,
  topic: string
): Promise<number> {
  const prompt = `You are an educational assessment expert. Estimate the difficulty of the following quiz question for HBO (Dutch higher professional education, bachelor level, year 3) students who have attended lectures on the topic but are not deep specialists.

Topic: ${topic}
Question: ${questionText}
Options: ${options.join(' | ')}
Correct answer: ${correctAnswer}

Return ONLY a single decimal number between 0.0 and 1.0 representing the P-score (proportion of HBO-3 students expected to answer correctly):
- 0.0–0.3 = very hard (specialist knowledge required, few will get it right)
- 0.3–0.7 = medium difficulty (requires solid understanding of the topic)
- 0.7–1.0 = easy (general awareness or common sense is enough)

Consider that true/false questions are easier by default (50% chance by guessing). Adjust accordingly.
Respond with just the number, e.g.: 0.65`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const score = parseFloat(text)
    if (isNaN(score)) return 0.5
    return Math.max(0, Math.min(1, score))
  } catch {
    return 0.5
  }
}
