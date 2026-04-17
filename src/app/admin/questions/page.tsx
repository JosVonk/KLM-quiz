'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Question } from '@/types'
import Link from 'next/link'

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')

  async function load() {
    const res = await fetch('/api/admin/questions')
    const { questions: qs } = await res.json()
    setQuestions(qs ?? [])
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: false, approved: true }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    load()
  }

  const shown = filter === 'flagged' ? questions.filter(q => q.flagged) : questions

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-klm-dark">Questions</h1>
        <div className="flex gap-2">
          <Link href="/admin/questions/import"><Button variant="secondary">Import</Button></Link>
          <Link href="/admin/questions/new"><Button>+ New</Button></Link>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-klm-blue text-white' : 'bg-gray-100 text-gray-600'}`}>All ({questions.length})</button>
        <button onClick={() => setFilter('flagged')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'flagged' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Flagged ({questions.filter(q => q.flagged).length})</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Question</th>
              <th className="pb-2 pr-4 font-medium">Topic</th>
              <th className="pb-2 pr-4 font-medium">P-score</th>
              <th className="pb-2 pr-4 font-medium">Rit</th>
              <th className="pb-2 pr-4 font-medium">Asked</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(q => (
              <tr key={q.id} className={`border-b ${q.flagged ? 'bg-red-50' : ''}`}>
                <td className="py-2 pr-4 max-w-xs truncate">{q.question_en}</td>
                <td className="py-2 pr-4 text-xs text-gray-500">{q.topic.replace(/_/g, ' ')}</td>
                <td className="py-2 pr-4">{q.p_score.toFixed(2)}</td>
                <td className="py-2 pr-4">{q.rit_value?.toFixed(2) ?? '—'}</td>
                <td className="py-2 pr-4">{q.times_asked}</td>
                <td className="py-2 flex gap-1">
                  {q.flagged && <Button variant="secondary" className="text-xs" onClick={() => approve(q.id)}>Approve</Button>}
                  <Button variant="danger" className="text-xs" onClick={() => remove(q.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
