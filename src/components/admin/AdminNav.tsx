import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  Inbox,
  LogOut,
  MessageSquare,
  Presentation,
  Tags,
  UserRound,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useNewQuestions, useUnreadMessages } from '../../hooks/useUnreadMessages'
import ThemeToggle from '../ui/ThemeToggle'

interface SubItem {
  label: string
  href: string
  icon: LucideIcon
  // Another site, opened in a new tab.
  external?: boolean
  // Shows a count: contact messages not opened yet, or visitors'
  // questions since Questions was last opened.
  count?: 'unread' | 'new'
}

interface Group {
  label: string
  // Where the group's own label goes: its most used page.
  href: string
  children: SubItem[]
}

const GROUPS: Group[] = [
  {
    label: 'Archives',
    href: '/admin/notes',
    children: [
      { label: 'Notes', href: '/admin/notes', icon: FileText },
      { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
      { label: 'Categories', href: '/admin/categories', icon: Tags },
      { label: 'Talks', href: '/admin/talks', icon: Presentation },
    ],
  },
  {
    label: 'Monitoring',
    href: '/admin/messages',
    children: [
      { label: 'Messages', href: '/admin/messages', icon: Inbox, count: 'unread' },
      { label: 'Questions', href: '/admin/questions', icon: MessageSquare, count: 'new' },
      { label: 'Visitors', href: '/admin/visitors', icon: Users },
      // Dashboards for the home cluster. Both sit behind Cloudflare Access,
      // so a visitor who finds these links only reaches a login page.
      { label: 'Grafana', href: 'https://grafana.yarikama.com', icon: Gauge, external: true },
      { label: 'Argo CD', href: 'https://argocd.yarikama.com', icon: GitBranch, external: true },
    ],
  },
]

const SUB_LINK = `flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-widest
  transition-colors hover:bg-paper-dark focus-visible:bg-paper-dark`

export default function AdminNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const counts = { unread: useUnreadMessages() ?? 0, new: useNewQuestions() ?? 0 }

  // Tailwind's hover variants only apply where the screen can hover, and
  // Safari doesn't focus a tapped link, so on a phone or an iPad a tap on a
  // group's label opens its menu instead. Kept with the page it was opened
  // on, so it is closed again on the next page.
  const canHover = useMediaQuery('(hover: hover)')
  const [tapped, setTapped] = useState<{ label: string; path: string } | null>(null)
  const openLabel = tapped?.path === location.pathname ? tapped.label : null
  const openRef = useRef<HTMLLIElement>(null)

  // A tap anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!openLabel) return
    const handlePointerDown = (e: PointerEvent) => {
      if (!openRef.current?.contains(e.target as Node)) setTapped(null)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setTapped(null)
      if (document.activeElement instanceof HTMLElement && openRef.current?.contains(document.activeElement)) {
        document.activeElement.blur()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openLabel])
  const badge = (n: number, label: string, className = '') =>
    n > 0 ? (
      <span
        aria-label={`${n} ${label}`}
        className={`min-w-5 rounded-full bg-sage px-1.5 text-center font-mono text-[0.625rem] leading-5 text-paper ${className}`}
      >
        {n}
      </span>
    ) : null

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  const isActive = (sub: SubItem) => !sub.external && location.pathname.startsWith(sub.href)

  const renderSubLink = (sub: SubItem) => {
    const className = `${SUB_LINK} ${
      isActive(sub) ? 'text-ink dark:text-white' : 'text-zinc-500 hover:text-ink dark:hover:text-white'
    }`
    const content = (
      <>
        <sub.icon aria-hidden="true" className="w-4 h-4 shrink-0" />
        {sub.label}
        {sub.count && badge(counts[sub.count], sub.count, 'ml-auto')}
        {sub.external && <ArrowUpRight aria-hidden="true" className="w-3 h-3 ml-auto" />}
      </>
    )
    const close = () => setTapped(null)
    if (sub.external) {
      return (
        <a href={sub.href} target="_blank" rel="noopener noreferrer" onClick={close} className={className}>
          {content}
        </a>
      )
    }
    return (
      <Link
        to={sub.href}
        aria-current={isActive(sub) ? 'page' : undefined}
        onClick={close}
        className={className}
      >
        {content}
      </Link>
    )
  }

  // Hover or keyboard focus opens it (CSS only), as in the site's header,
  // and a tap where hover isn't possible (data-open). The padding on top
  // bridges the gap, so the pointer can travel from the label into the
  // panel, and it closes after a short delay rather than as soon as the
  // pointer slips off.
  const renderGroup = (group: Group, index: number) => {
    // The last menu opens leftward on a phone, so it stays on the screen.
    const align = index === GROUPS.length - 1 ? 'right-0 sm:right-auto sm:left-0' : 'left-0'

    const active = group.children.some(isActive)
    const open = openLabel === group.label
    return (
      <li
        key={group.label}
        ref={open ? openRef : undefined}
        data-open={open || undefined}
        className="group relative"
      >
        <Link
          to={group.href}
          aria-expanded={canHover ? undefined : open}
          onClick={(e) => {
            if (canHover) return
            e.preventDefault()
            // Chrome focuses a tapped link, which would hold it open.
            if (open) e.currentTarget.blur()
            setTapped(open ? null : { label: group.label, path: location.pathname })
          }}
          className={`
            inline-flex items-center gap-1.5 px-4 py-2 rounded
            font-mono text-xs uppercase tracking-widest transition-colors
            ${
              active
                ? 'bg-zinc-100 dark:bg-zinc-800 text-ink dark:text-white'
                : 'text-zinc-500 hover:text-ink dark:hover:text-white'
            }
          `}
        >
          {group.label}
          {badge(
            group.children.reduce((sum, sub) => sum + (sub.count ? counts[sub.count] : 0), 0),
            'new or unread',
          )}
          <ChevronDown
            aria-hidden="true"
            className="w-3 h-3 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180 group-data-open:rotate-180 motion-reduce:transition-none"
          />
        </Link>
        <div
          className={`absolute ${align} top-full pt-2 z-50
            invisible opacity-0 translate-y-1 delay-150
            group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:delay-0
            group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:delay-0
            group-data-open:visible group-data-open:opacity-100 group-data-open:translate-y-0 group-data-open:delay-0
            transition-[opacity,translate,visibility] duration-150 motion-reduce:transition-none`}
        >
          <ul
            aria-label={group.label}
            className="min-w-48 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-paper shadow-lg"
          >
            {group.children.map((sub) => (
              <li key={sub.label}>{renderSubLink(sub)}</li>
            ))}
          </ul>
        </div>
      </li>
    )
  }

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-paper dark:bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-6">
        {/* On a phone the menus take a second row, below the mark and the
            buttons, instead of pushing the buttons off the screen. */}
        <div className="flex flex-wrap items-center justify-between gap-y-1 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <div className="contents sm:flex sm:items-center sm:gap-8">
            {/* The site's own mark, opening the site in a new tab so the
                editor stays open here. */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="View site"
              className="font-serif text-xl font-light tracking-tight hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              &lt;H,H&gt;
            </a>

            <ul className="order-last -ml-4 flex basis-full items-center gap-1 sm:order-none sm:ml-0 sm:basis-auto">
              {/* Back to the welcome page. */}
              <li>
                <Link
                  to="/admin"
                  aria-current={location.pathname === '/admin' ? 'page' : undefined}
                  className={`
                    inline-flex items-center gap-1.5 px-4 py-2 rounded
                    font-mono text-xs uppercase tracking-widest transition-colors
                    ${
                      location.pathname === '/admin'
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-ink dark:text-white'
                        : 'text-zinc-500 hover:text-ink dark:hover:text-white'
                    }
                  `}
                >
                  Desk
                </Link>
              </li>
              {GROUPS.map(renderGroup)}
            </ul>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              // Back to the welcome page, the admin's desk.
              <Link
                to="/admin"
                title={`Signed in as ${user.email}. Back to your desk`}
                className="hidden md:inline-flex items-center gap-1.5 max-w-[16rem] font-mono text-xs text-zinc-400 hover:text-ink transition-colors"
              >
                <UserRound size={14} className="shrink-0" />
                <span className="truncate">{user.email}</span>
              </Link>
            )}
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-ink dark:hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
