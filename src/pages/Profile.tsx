import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import BottomNav from '@/components/BottomNav'

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-[100dvh] bg-warm safe-top pb-24 px-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="display text-3xl font-bold lowercase mb-8 text-foreground">profile</h1>
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">signed in as</p>
          <p className="text-foreground font-medium">{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full border border-border rounded-2xl py-3.5 text-muted-foreground font-medium lowercase hover:text-foreground transition-colors"
        >
          sign out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
