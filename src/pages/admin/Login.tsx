import { useLocation, useSearchParams } from 'react-router-dom'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { authService, signInErrorMessage } from '../../services/api/auth'

export default function AdminLogin() {
  const location = useLocation()
  const [params] = useSearchParams()
  // Set by the API when sign-in did not succeed.
  const error = signInErrorMessage(params.get('error'))

  const from = (location.state as { from?: Location })?.from?.pathname || '/admin'

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-[#0f0f0f] px-4 relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-light tracking-tight mb-2">Admin</h1>
          <p className="text-sm text-zinc-faded">Sign in to manage content</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* A plain link: the API runs the sign-in and sends the browser
              to Google and back, so this page loads nothing from Google. */}
          <a
            href={authService.signInUrl(from)}
            className="
              w-full py-3 rounded-xl border border-ink dark:border-zinc-400
              font-mono text-sm uppercase tracking-widest
              hover:bg-ink hover:text-paper dark:hover:bg-zinc-400 dark:hover:text-zinc-900
              transition-all duration-300
              flex items-center justify-center gap-2
            "
          >
            Sign in with Google
          </a>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors"
          >
            Back to Site
          </a>
        </div>
      </div>
    </div>
  )
}
