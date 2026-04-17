'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleImport() {
    setLoading(true)
    try {
      const questions = JSON.parse(text)
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      const json = await res.json()
      if (json.error) { setResult(`Error: ${json.error}`); setLoading(false); return }
      setResult(`Successfully imported ${json.imported} questions.`)
    } catch {
      setResult('Invalid JSON. Check the format below.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-klm-dark">Import Questions</h1>
        <pre className="bg-klm-light rounded-lg p-3 text-xs text-gray-700 overflow-x-auto">{`[
  {
    "topic": "klm_marketing",
    "type": "multiple_choice",
    "question_en": "What is KLM's primary hub airport?",
    "options": ["Schiphol", "Heathrow", "CDG", "Frankfurt"],
    "correct_answer": "Schiphol",
    "media_url": null
  }
]`}</pre>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste JSON array of questions here…"
          className="w-full h-64 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-klm-blue"
        />
        {result && <p className={`text-sm ${result.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{result}</p>}
        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={loading || !text.trim()}>
            {loading ? 'Importing…' : 'Import'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/questions')}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
