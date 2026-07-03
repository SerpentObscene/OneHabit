import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface OnboardingProps {
  userId: string
  onCreated: () => void
}

export default function Onboarding({ userId, onCreated }: OnboardingProps) {
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [emoji, setEmoji] = useState('🔥')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (name.trim().length > 100 || detail.trim().length > 200) return
    setSaving(true)

    const { error } = await supabase.from('habits').insert({
      user_id: userId,
      name: name.trim(),
      detail: detail.trim() || null,
      emoji: emoji || null,
      archived: false,
    })

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    onCreated()
  }

  return (
    <div className="min-h-[100dvh] bg-warm safe-top flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-5xl mb-6">🔥</div>
        <h1 className="display text-3xl font-bold lowercase mb-2 text-foreground">
          your one habit
        </h1>
        <p className="text-muted-foreground mb-8 lowercase">
          what are you doing every single day?
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <input
              className="w-14 bg-card border border-border rounded-2xl px-3 py-3 text-center text-xl focus:outline-none focus:ring-2 focus:ring-ember/40"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              maxLength={2}
            />
            <input
              className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ember/40 lowercase"
              placeholder="habit name (e.g. meditate)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>

          <input
            className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ember/40"
            placeholder="duration (e.g. 10 min) — optional"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            maxLength={200}
          />

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-ember text-white rounded-2xl py-3.5 font-semibold lowercase disabled:opacity-50 transition-opacity"
          >
            {saving ? 'saving…' : 'start →'}
          </button>
        </form>
      </div>
    </div>
  )
}
