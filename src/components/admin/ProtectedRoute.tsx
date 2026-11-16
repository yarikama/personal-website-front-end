import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { markOwner } from '../../lib/analytics'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const { status } = useAuth()

  // Signed in: this is the owner's browser, so analytics skips it from now on
  useEffect(() => {
    if (status === 'signed-in') markOwner()
  }, [status])

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-[#0f0f0f]">
        <Loader2 size={20} className="animate-spin text-zinc-faded" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-paper dark:bg-[#0f0f0f] px-4 text-center">
        <p className="text-sm text-zinc-faded">Could not check your sign-in. The API may be down.</p>
        <button
          onClick={() => window.location.reload()}
          className="font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink dark:hover:text-white transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (status === 'signed-out') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
