'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { COUNTRIES } from '@/lib/countries'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import Image from 'next/image'

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [nationality, setNationality] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(data)
      setNationality(data?.nationality ?? '')
    }
    load()
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData()
    formData.set('nationality', nationality)
    if (file) formData.set('photo', file)
    const res = await fetch('/api/profile', { method: 'PATCH', body: formData })
    const json = await res.json()
    setSaving(false)
    setMessage(json.error ?? 'Profile saved!')
  }

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <Card>
        <h1 className="text-xl font-bold text-klm-dark mb-6">Your Profile</h1>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-klm-light border-2 border-klm-blue">
              {(preview || profile?.photo_url) ? (
                <Image src={preview ?? profile!.photo_url!} alt="avatar" width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-klm-blue text-3xl font-bold">
                  {profile?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              Upload photo
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nationality</label>
            <select value={nationality} onChange={e => setNationality(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue">
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/lobby')}>Go to lobby</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
