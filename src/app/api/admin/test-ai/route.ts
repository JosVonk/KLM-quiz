import { NextResponse } from 'next/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

export async function GET() {
  const keyPresent = !!process.env.GEMINI_API_KEY
  const score = await estimatePScore(
    'What is the primary color of the KLM brand?',
    ['Red', 'Royal Blue', 'Green', 'Yellow'],
    'Royal Blue',
    'klm_brand_guide'
  )
  return NextResponse.json({ keyPresent, score })
}
