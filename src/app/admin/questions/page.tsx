'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Question } from '@/types'
import Link from 'next/link'

interface ScanState {
  active: boolean
  total: number
  done: number
  current: string
  results: Record<string, number>
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')
  const [scan, setScan] = useState<ScanState>({ active: false, total: 0, done: 0, current: '', results: {} })

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

  async function scanAll() {
    if (!confirm(`Individually assess all ${questions.length} questions with AI (HBO-3 level)? This will take ~2 minutes.`)) return

    setScan({ active: true, total: questions.length, done: 0, current: '', results: {} })

    const results: Record<string, number> = {}

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      setScan(s => ({ ...s, done: i, current: q.question_en }))
      try {
        const res = await fetch(`/api/admin/questions/${q.id}/rescan`, { method: 'POST' })
        const json = await res.json()
        if (json.p_score !== undefined) {
          results[q.id] = json.p_score
          setScan(s => ({ ...s, results: { ...s.results, [q.id]: json.p_score } }))
        }
      } catch {
        // skip failed
      }
    }

    setScan(s => ({ ...s, active: false, done: questions.length, current: '' }))
    await load()
  }

  function stopScan() {
    setScan(s => ({ ...s, active: false, current: '' }))
  }

  const shown = filter === 'flagged' ? questions.filter(q => q.flagged) : questions
  const pct = scan.total > 0 ? Math.round((scan.done / scan.total) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-klm-dark">Questions</h1>
        <div className="flex gap-2">
          {scan.active
            ? <Button variant="danger" onClick={stopScan}>Stop Scan</Button>
            : <Button variant="secondary" onClick={scanAll}>Scan All P-scores</Button>
          }
          <Link href="/admin/questions/import"><Button variant="secondary">Import</Button></Link>
          <Link href="/admin/questions/new"><Button>+ New</Button></Link>
        </div>
      </div>

      {(scan.active || scan.done > 0) && (
        <div className="mb-6 bg-klm-light border border-klm-blue/20 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm font-medium text-klm-dark">
            <span>{scan.active ? `Assessing question ${scan.done + 1} of ${scan.total}…` : `Scan complete — ${scan.done} questions updated`}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-klm-blue rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {scan.current && (
            <p className="text-xs text-gray-500 truncate">&ldquo;{scan.current}&rdquo;</p>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-klm-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
          All ({questions.length})
        </button>
        <button onClick={() => setFilter('flagged')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'flagged' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Flagged ({questions.filter(q => q.flagged).length})
        </button>
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
            {shown.map(q => {
              const liveScore = scan.results[q.id]
              const isScanning = scan.active && scan.current === q.question_en
              return (
                <tr key={q.id} className={`border-b transition-colors ${isScanning ? 'bg-klm-light' : q.flagged ? 'bg-red-50' : ''}`}>
                  <td className="py-2 pr-4 max-w-xs truncate">{q.question_en}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{q.topic.replace(/_/g, ' ')}</td>
                  <td className="py-2 pr-4 font-mono">
                    {isScanning
                      ? <span className="text-klm-blue animate-pulse">…</span>
                      : liveScore !== undefined
                        ? <span className="text-klm-blue font-semibold">{liveScore.toFixed(2)}</span>
                        : q.p_score.toFixed(2)
                    }
                  </td>
                  <td className="py-2 pr-4">{q.rit_value?.toFixed(2) ?? '—'}</td>
                  <td className="py-2 pr-4">{q.times_asked}</td>
                  <td className="py-2 flex gap-1 flex-wrap">
                    <Link href={`/admin/questions/${q.id}/edit`}>
                      <Button variant="secondary" className="text-xs">Edit</Button>
                    </Link>
                    {q.flagged && <Button variant="secondary" className="text-xs" onClick={() => approve(q.id)}>Approve</Button>}
                    <Button variant="danger" className="text-xs" onClick={() => remove(q.id)}>Delete</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
