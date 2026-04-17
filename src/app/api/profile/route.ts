import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const nationality = formData.get('nationality') as string | null
  const photo = formData.get('photo') as File | null

  let photo_url: string | undefined

  if (photo && photo.size > 0) {
    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo must be under 2 MB' }, { status: 400 })
    }
    const ext = photo.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, photo, { upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    photo_url = data.publicUrl
  }

  const update: Record<string, unknown> = {}
  if (nationality) update.nationality = nationality
  if (photo_url) update.photo_url = photo_url

  const { error } = await supabase.from('users').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
