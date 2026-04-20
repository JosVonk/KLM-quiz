'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [keySet, setKeySet] = useState(false)
  const [masked, setMasked] = useState('')
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        setKeySet(d.gemini_api_key_set)
        setMasked(d.gemini_api_key)
      })
  }, [])

  async function save() {
    if (!newKey.trim()) return
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gemini_api_key: newKey.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setMessage({ type: 'ok', text: 'API key saved successfully.' })
      setNewKey('')
      // refresh masked display
      const d = await fetch('/api/admin/settings').then(r => r.json())
      setKeySet(d.gemini_api_key_set)
      setMasked(d.gemini_api_key)
    } else {
      const { error } = await res.json()
      setMessage({ type: 'err', text: error ?? 'Failed to save.' })
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-klm-dark">Settings</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-klm-dark">Gemini API Key</h2>
        <p className="text-sm text-gray-500">
          Used to estimate question difficulty (P-score) via AI. The key is stored securely in the database and used on the server — it is never exposed to the browser.
        </p>

        {keySet && (
          <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-600">
            Current key: {masked}
          </div>
        )}
        {!keySet && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No API key set. P-score scanning will fall back to the environment variable.
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {keySet ? 'Replace API key' : 'Set API key'}
          </label>
          <input
            type="password"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="AIza..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-klm-blue"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving || !newKey.trim()}
          className="px-4 py-2 rounded-lg bg-klm-dark text-white text-sm font-semibold disabled:opacity-40 hover:bg-klm-blue transition-colors"
        >
          {saving ? 'Saving…' : 'Save Key'}
        </button>
      </div>
    </div>
  )
}
