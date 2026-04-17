'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import type { Topic, QuestionType } from '@/types'

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'klm_marketing', label: 'KLM Marketing Organisation' },
  { value: 'klm_brand_management', label: 'KLM Brand Management' },
  { value: 'klm_brand_guide', label: 'KLM Brand Guide' },
  { value: 'klm_tagless_luggage', label: 'KLM Tagless Luggage' },
  { value: 'virtual_humans', label: 'Virtual Humans' },
  { value: 'vibecoding', label: 'Vibecoding' },
]

export default function NewQuestionPage() {
  const [topic, setTopic] = useState<Topic>('klm_marketing')
  const [type, setType] = useState<QuestionType>('multiple_choice')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const displayOptions = type === 'true_false' ? ['True', 'False'] : options

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic, type, question_en: question,
        options: displayOptions.filter(Boolean),
        correct_answer: correct,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.error) { setError(json.error); return }
    router.push('/admin/questions')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-klm-dark">New Question</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Topic</label>
          <select value={topic} onChange={e => setTopic(e.target.value as Topic)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue focus:outline-none">
            {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as QuestionType)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue focus:outline-none">
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True / False</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Question (English)</label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue focus:outline-none" />
        </div>
        {type === 'multiple_choice' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Options</label>
            {options.map((o, i) => (
              <input key={i} value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                placeholder={`Option ${i + 1}`}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue focus:outline-none" />
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Correct Answer</label>
          <select value={correct} onChange={e => setCorrect(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue focus:outline-none">
            <option value="">Select correct answer…</option>
            {displayOptions.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-xs text-gray-500">AI will estimate the initial P-score automatically on save.</p>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !question || !correct}>
            {saving ? 'Saving…' : 'Save Question'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/questions')}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
