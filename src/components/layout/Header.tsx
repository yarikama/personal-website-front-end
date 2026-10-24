import { useState, useEffect, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, FileText, Github, Linkedin, Mail, MessageSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Container from './Container'
import ThemeToggle from '../ui/ThemeToggle'
import { useScrollSpy } from '../../hooks/useScrollSpy'
import { hasAdminHint } from '../../services/api/auth'
import { publicTalks } from '../../talks'

interface SubItem {
  label: string
  href: string
  icon?: LucideIcon
  // Opens in a new tab: another site, or a file such as the resume.
  newTab?: boolean
}

interface NavItem {
  label: string
  href: string
  isRoute?: boolean
  // The home page section that marks this item active while it is on screen
  sectionId?: string
  // Shown in a dropdown on hover or keyboard focus, and indented under the
  // item in the mobile menu. The item itself still goes to its section.
  children?: SubItem[]
}

// Works and Notes open their own pages, and are also marked while their
// previews on the home page are on screen. Talks shows once there is a public
// one to list.
const navItems: NavItem[] = [
  { label: 'Ask', href: '/#ask', sectionId: 'ask' },
  {
    label: 'About',
    href: '/#about',
    sectionId: 'about',
    children: [
      { label: 'Story', href: '/#about' },
      { label: 'Experience', href: '/#experience' },
      { label: 'Skills', href: '/#skills' },
    ],
  },
  { label: 'Works', href: '/works', isRoute: true, sectionId: 'works' },
  { label: 'Notes', href: '/notes', isRoute: true, sectionId: 'notes' },
  ...(publicTalks.length > 0 ? [{ label: 'Talks', href: '/talks', isRoute: true }] : []),
  {
    label: 'Contact',
    href: '/#contact',
    sectionId: 'contact',
    children: [
      { label: 'Contact form', href: '/#contact', icon: MessageSquare },
      { label: 'Email', href: 'mailto:hsuhengjui@gmail.com', icon: Mail },
      { label: 'LinkedIn', href: 'https://linkedin.com/in/yarikama', icon: Linkedin, newTab: true },
      { label: 'GitHub', href: 'https://github.com/yarikama', icon: Github, newTab: true },
      { label: 'Resume', href: '/resume.pdf', icon: FileText, newTab: true },
    ],
  },
]

/**
 * Scrolls to a home page section. The Ask section also gets the cursor in
 * its input, so the visitor can type right away; not on touch screens,
 * where that would pop up the keyboard over the section.
 */
function scrollToSection(hash: string) {
  const element = document.querySelector(hash)
  if (!element) return
  element.scrollIntoView()
  if (hash === '#ask' && window.matchMedia('(pointer: fine)').matches) {
    element.querySelector('textarea')?.focus({ preventScroll: true })
  }
}

// Only in a browser where the admin has signed in (services/api/auth.ts):
// visitors never see it.
const ADMIN_ITEM: NavItem = { label: 'Admin', href: '/admin', isRoute: true }

const sectionIds = navItems
  .filter((item) => item.sectionId)
  .map((item) => item.sectionId as string)
const noSections: string[] = []

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const items = useMemo(() => (hasAdminHint() ? [...navItems, ADMIN_ITEM] : navItems), [])
  // The header stays mounted across pages: switching the list when the home
  // page comes back makes the spy look up its freshly rendered sections.
  const activeSection = useScrollSpy({ sectionIds: isHomePage ? sectionIds : noSections })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close the mobile menu whenever the route or hash changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location])

  // Close the mobile menu with Escape
  useEffect(() => {
    if (!isMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  // Handle hash navigation after route change. scrollIntoView without an
  // explicit behavior follows the CSS scroll-behavior, which honors reduced motion.
  useEffect(() => {
    if (location.hash) {
      const hash = location.hash
      const timer = setTimeout(() => scrollToSection(hash), 100)
      return () => clearTimeout(timer)
    }
  }, [location])

  const handleNavClick = (href: string, isRoute?: boolean) => {
    setIsMenuOpen(false)
    // A dropdown stays open while focus is inside it; let it close.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!isRoute && href.startsWith('/#')) {
      if (location.pathname === '/') {
        scrollToSection(href.substring(1))
      }
    }
  }

  const isActive = (item: NavItem): boolean => {
    // For route-based items, check if current path starts with the href
    if (item.isRoute && location.pathname.startsWith(item.href)) {
      return true
    }
    // For section-based items, check scroll spy (only on home page)
    if (item.sectionId && isHomePage) {
      return activeSection === item.sectionId
    }
    return false
  }

  const renderNavLink = (item: NavItem) => (
    <Link
      to={item.href}
      onClick={() => handleNavClick(item.href, item.isRoute)}
      aria-current={isActive(item) ? 'page' : undefined}
      // The active item is also underlined, the line drawing in from the left
      className={`
        relative inline-flex items-center gap-1
        font-mono text-[0.8125rem] uppercase tracking-widest
        transition-colors duration-300
        after:absolute after:left-0 after:-bottom-1.5 after:h-0.5 after:w-full after:bg-sage
        after:origin-left after:transition-transform after:duration-500 after:ease-[var(--ease-elegant)]
        ${isActive(item) ? 'text-sage after:scale-x-100' : 'text-zinc-faded hover:text-sage after:scale-x-0'}
      `}
    >
      {item.label}
      {item.children && (
        <ChevronDown
          aria-hidden="true"
          className="hidden md:block w-3 h-3 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180 motion-reduce:transition-none"
        />
      )}
    </Link>
  )

  const renderSubLink = (sub: SubItem, className: string) => {
    const content = (
      <>
        {sub.icon && <sub.icon aria-hidden="true" className="w-4 h-4 shrink-0" />}
        {sub.label}
      </>
    )
    if (sub.newTab || !sub.href.startsWith('/')) {
      return (
        <a
          href={sub.href}
          onClick={() => handleNavClick(sub.href, true)}
          {...(sub.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className={className}
        >
          {content}
        </a>
      )
    }
    return (
      <Link to={sub.href} onClick={() => handleNavClick(sub.href)} className={className}>
        {content}
      </Link>
    )
  }

  // Hover or keyboard focus opens it (CSS only). The padding on top bridges
  // the gap, so the pointer can travel from the item into the panel, and it
  // closes after a short delay rather than as soon as the pointer slips off.
  const renderDropdown = (item: NavItem) => (
    <div
      className="absolute left-1/2 top-full -translate-x-1/2 pt-3 z-50
        invisible opacity-0 translate-y-1 delay-150
        group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:delay-0
        group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:delay-0
        transition-[opacity,translate,visibility] duration-150 motion-reduce:transition-none"
    >
      <ul
        aria-label={item.label}
        className="min-w-48 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-paper shadow-lg"
      >
        {item.children!.map((sub) => (
          <li key={sub.label}>
            {renderSubLink(
              sub,
              `flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-widest
              text-zinc-faded hover:text-sage hover:bg-paper-dark focus-visible:bg-paper-dark transition-colors`
            )}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-colors duration-500
        ${
          isMenuOpen
            ? 'bg-paper dark:bg-[#0f0f0f] shadow-sm'
            : isScrolled
              ? 'bg-paper/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm'
              : 'bg-transparent'
        }
      `}
    >
      <Container>
        <nav className="flex items-center justify-between py-6">
          <Link to="/" className="font-serif text-xl font-light tracking-tight">
            &lt;H,H&gt;
          </Link>

          <ul className="hidden md:flex items-center gap-8">
            {items.map((item) => (
              <li key={item.href} className={item.children ? 'group relative' : undefined}>
                {renderNavLink(item)}
                {item.children && renderDropdown(item)}
              </li>
            ))}
            <li>
              <ThemeToggle />
            </li>
          </ul>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="md:hidden font-mono text-[0.8125rem] uppercase tracking-widest"
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </nav>

        {isMenuOpen && (
          <div
            id="mobile-menu"
            // With the sub-items it can be taller than a small phone: it scrolls.
            className="md:hidden pb-6 border-t border-zinc-200 dark:border-zinc-200/20 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain"
          >
            <ul className="flex flex-col gap-5 pt-6">
              {items.map((item) => (
                <li key={item.href}>
                  {renderNavLink(item)}
                  {item.children && (
                    <ul aria-label={item.label} className="mt-3 pl-4 flex flex-col border-l border-zinc-200 dark:border-zinc-200/20">
                      {item.children.map((sub) => (
                        <li key={sub.label}>
                          {renderSubLink(
                            sub,
                            'flex items-center gap-3 py-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-sage transition-colors'
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 -ml-2">
              <ThemeToggle />
            </div>
          </div>
        )}
      </Container>
    </header>
  )
}
