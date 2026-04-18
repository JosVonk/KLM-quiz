'use client'

import { useEffect, useState } from 'react'
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

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const [topic, setTopic] = useState<Topic>('klm_marketing')
  const [type, setType] = useState<QuestionType>('multiple_choice')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState('')
  const [saving, setSaving] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [pScore, setPScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/questions')
      .then(r => r.json())
      .then(({ questions }) => {
        const q = questions?.find((q: { id: string }) => q.id === params.id)
        if (!q) { router.push('/admin/questions'); return }
        setTopic(q.topic)
        setType(q.type)
        setQuestion(q.question_en)
        setOptions(q.type === 'multiple_choice' ? q.options : ['True', 'False'])
        setCorrect(q.correct_answer)
        setPScore(q.p_score)
        setLoading(false)
      })
  }, [params.id, router])

  const displayOptions = type === 'true_false' ? ['True', 'False'] : options

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/questions/${params.id}`, {
      method: 'PATCH',
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

  async function handleRescan() {
    setRescanning(true)
    const res = await fetch(`/api/admin/questions/${params.id}/rescan`, { method: 'POST' })
    const json = await res.json()
    setRescanning(false)
    if (json.p_score !== undefined) setPScore(json.p_score)
  }

  if (loading) return <div className="flex justify-center mt-20 text-klm-blue animate-pulse">Loading…</div>

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-klm-dark">Edit Question</h1>
          {pScore !== null && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              P-score: <span className="font-semibold text-klm-dark">{pScore.toFixed(2)}</span>
            </span>
          )}
        </div>

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

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleSave} disabled={saving || !question || !correct}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button variant="secondary" onClick={handleRescan} disabled={rescanning}>
            {rescanning ? 'Scanning…' : 'Re-scan P-score'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/questions')}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
