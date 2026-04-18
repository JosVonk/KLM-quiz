'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { countryFlag } from '@/lib/countries'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/admin/users')
    const { users: u } = await res.json()
    setUsers(u ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function resetPassword(id: string, username: string) {
    const password = prompt(`New password for ${username}:`)
    if (!password) return
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else alert('Password updated.')
  }

  async function setPosition(id: string, current: number) {
    const input = prompt(`New ladder position for this user (current: ${current}):`)
    if (!input) return
    const pos = parseInt(input)
    if (isNaN(pos) || pos < 1) { alert('Invalid position'); return }
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ladder_position: pos }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else load()
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else load()
  }

  if (loading) return <div className="flex justify-center mt-20 text-klm-blue animate-pulse">Loading…</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-klm-dark">Users ({users.length})</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Rank</th>
              <th className="pb-2 pr-4 font-medium">Player</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Last active</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4 font-mono font-bold text-klm-dark">
                  {u.ladder_position > 0 ? `#${u.ladder_position}` : '—'}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    {u.nationality && <span className="text-base">{countryFlag(u.nationality)}</span>}
                    <div>
                      <div className="font-medium">{u.username}</div>
                      {u.is_admin && <span className="text-xs text-klm-blue font-semibold">Admin</span>}
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.status === 'in_match' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-500 text-xs">
                  {new Date(u.last_active_at).toLocaleTimeString()}
                </td>
                <td className="py-2 flex gap-1 flex-wrap">
                  <Button variant="secondary" className="text-xs" onClick={() => setPosition(u.id, u.ladder_position)}>
                    Move
                  </Button>
                  <Button variant="secondary" className="text-xs" onClick={() => resetPassword(u.id, u.username)}>
                    Reset PW
                  </Button>
                  {!u.is_admin && (
                    <Button variant="danger" className="text-xs" onClick={() => deleteUser(u.id, u.username)}>
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
