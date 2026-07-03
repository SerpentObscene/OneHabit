import { useNavigate, useLocation } from 'react-router-dom'
import { Home, BarChart2, User } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items = [
    { icon: Home, path: '/' },
    { icon: BarChart2, path: '/insights' },
    { icon: User, path: '/profile' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur border-t border-border flex justify-around items-end"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      {items.map(({ icon: Icon, path }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`flex items-center justify-center px-8 pt-4 pb-3 transition-colors ${
            pathname === path ? 'text-ember' : 'text-muted-foreground'
          }`}
        >
          <Icon className="w-6 h-6" />
        </button>
      ))}
    </nav>
  )
}
