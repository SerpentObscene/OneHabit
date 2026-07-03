import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Settings } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-end"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <button
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1 px-8 pt-3 pb-2 transition-colors ${
          pathname === '/' ? 'text-ember' : 'text-muted-foreground'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-xs lowercase">today</span>
      </button>
      <button
        onClick={() => navigate('/settings')}
        className={`flex flex-col items-center gap-1 px-8 pt-3 pb-2 transition-colors ${
          pathname === '/settings' ? 'text-ember' : 'text-muted-foreground'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-xs lowercase">settings</span>
      </button>
    </nav>
  )
}
