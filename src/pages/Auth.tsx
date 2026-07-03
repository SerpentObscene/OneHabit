import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-warm safe-top flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-5xl mb-6">🔥</div>
        <h1 className="display text-3xl font-bold lowercase mb-1 text-foreground">onehabit</h1>
        <p className="text-muted-foreground mb-10 lowercase">one habit. one tap. every day.</p>

        {sent ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-foreground font-medium mb-1">check your inbox</p>
            <p className="text-muted-foreground text-sm">magic link sent to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ember/40"
              placeholder="your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ember text-white rounded-2xl py-3.5 font-semibold lowercase disabled:opacity-50 transition-opacity"
            >
              {loading ? 'sending…' : 'send magic link →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
