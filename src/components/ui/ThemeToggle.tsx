import { Moon, Sun } from 'lucide-react'
import { setDark, useIsDark } from '../../lib/theme'

export default function ThemeToggle() {
  const isDark = useIsDark()

  return (
    <button
      onClick={() => setDark(!isDark)}
      className="p-2 text-zinc-faded hover:text-sage-ink transition-colors duration-300"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}
