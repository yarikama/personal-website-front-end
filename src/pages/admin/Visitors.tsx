import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Users } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import {
  adminVisitorsService,
  VisitorsUnavailableError,
  type VisitorCount,
  type VisitorDay,
  type VisitorsReport,
} from '../../services/api'

// Other people on the site, from Vercel Web Analytics: page views and
// visitors over a range, each day, and where they came from.

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
]
const DASHBOARD = 'https://vercel.com/yarikamas-projects/personal-website/analytics'

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
const REGION = new Intl.DisplayNames(['en'], { type: 'region' })

const day = (date: string) => new Date(`${date}T00:00:00Z`)
const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`

function chip(active: boolean) {
  return `px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
    active
      ? 'border-ink bg-ink text-paper dark:border-white dark:bg-white dark:text-zinc-900'
      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-ink dark:hover:text-white'
  }`
}

const LABEL = 'font-mono text-xs text-zinc-400 uppercase tracking-widest'

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <p className="mt-2 font-serif text-5xl md:text-6xl font-light tabular-nums">
        {value.toLocaleString('en-US')}
      </p>
    </div>
  )
}

// A column per day, its height the day's visitors. Hover, focus or a tap on
// a column shows the day; the table under it has every value.
function DailyChart({ days }: { days: VisitorDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.visitors))
  const peak = days.reduce((best, d) => (d.visitors > best.visitors ? d : best), days[0])
  const ticks = days.length > 7 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : days.map((_, i) => i)

  return (
    <figure>
      <figcaption className={LABEL}>Visitors each day (UTC)</figcaption>
      <div className="relative mt-6 h-40">
        {/* The baseline, recessive; the peak day carries its own number. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 border-t border-zinc-200 dark:border-zinc-800" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map((d, i) => {
            // Near either edge the tooltip opens inward, so it stays on screen.
            const align =
              i < days.length / 4 ? 'left-0' : i >= (days.length * 3) / 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
            const label = `${WEEKDAY.format(day(d.date))} ${DAY.format(day(d.date))}: ${plural(d.visitors, 'visitor')}, ${plural(d.pageviews, 'page view')}`
            return (
              <div
                key={d.date}
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <span
                  className="w-full max-w-6 rounded-t bg-sage transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                  style={{ height: d.visitors ? `${(d.visitors / max) * 100}%` : 0 }}
                />
                {d === peak && d.visitors > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute font-mono text-[10px] text-zinc-faded tabular-nums group-hover:hidden group-focus:hidden"
                    style={{ bottom: `calc(${(d.visitors / max) * 100}% + 4px)` }}
                  >
                    {d.visitors}
                  </span>
                )}
                <span
                  role="tooltip"
                  className={`pointer-events-none invisible absolute ${align} bottom-full z-10 mb-2 w-max rounded border border-zinc-200 dark:border-zinc-700 bg-paper px-3 py-2 text-left shadow-lg group-hover:visible group-focus:visible`}
                >
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    {WEEKDAY.format(day(d.date))} {DAY.format(day(d.date))}
                  </span>
                  <span className="mt-1 block text-sm">
                    <strong className="font-medium tabular-nums">{d.visitors.toLocaleString('en-US')}</strong>{' '}
                    <span className="text-zinc-faded">visitor{d.visitors === 1 ? '' : 's'}</span>
                  </span>
                  <span className="block text-sm">
                    <strong className="font-medium tabular-nums">{d.pageviews.toLocaleString('en-US')}</strong>{' '}
                    <span className="text-zinc-faded">page view{d.pageviews === 1 ? '' : 's'}</span>
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-[2px] font-mono text-[10px] text-zinc-400">
        {days.map((d, i) => (
          <span key={d.date} className="flex-1 text-center whitespace-nowrap">
            {ticks.includes(i) ? DAY.format(day(d.date)) : ''}
          </span>
        ))}
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-ink dark:hover:text-white">
          Each day as a table
        </summary>
        <table className="mt-3 w-full max-w-md text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              <th className="py-1 font-normal">Day (UTC)</th>
              <th className="py-1 text-right font-normal">Visitors</th>
              <th className="py-1 text-right font-normal">Page views</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {days.map((d) => (
              <tr key={d.date} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1.5">
                  {WEEKDAY.format(day(d.date))} {DAY.format(day(d.date))}
                </td>
                <td className="py-1.5 text-right">{d.visitors.toLocaleString('en-US')}</td>
                <td className="py-1.5 text-right text-zinc-faded">{d.pageviews.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

// The top ten of one dimension: a thin bar per row, its length the row's
// page views, with both numbers in text beside it.
function TopList({
  title,
  rows,
  name,
  empty,
}: {
  title: string
  rows: VisitorCount[]
  name: (row: VisitorCount) => string
  empty: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.pageviews))
  return (
    // min-w-0 lets a long path truncate instead of widening the grid column.
    <section className="min-w-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={LABEL}>{title}</h2>
        {rows.length > 0 && <span className="font-mono text-[10px] text-zinc-400">Visitors · views</span>}
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-faded">{empty}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.name || '(none)'}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0 truncate" title={name(row)}>
                  {name(row)}
                </span>
                <span className="shrink-0 tabular-nums">
                  {row.visitors.toLocaleString('en-US')}
                  <span className="text-zinc-faded"> · {row.pageviews.toLocaleString('en-US')}</span>
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 rounded-r-sm bg-paper-dark">
                <div className="h-full rounded-r-sm bg-sage" style={{ width: `${(row.pageviews / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

const country = (row: VisitorCount) => {
  if (!/^[A-Z]{2}$/.test(row.name)) return row.name || 'Unknown'
  return REGION.of(row.name) ?? row.name
}
const referrer = (row: VisitorCount) => row.name || 'None (typed in, or a bookmark)'
const device = (row: VisitorCount) => (row.name ? row.name[0].toUpperCase() + row.name.slice(1) : 'Unknown')
const page = (row: VisitorCount) => row.name || '/'

export default function AdminVisitors() {
  const [days, setDays] = useState(7)
  const [report, setReport] = useState<VisitorsReport | null>(null)
  const [error, setError] = useState<'off' | 'failed' | null>(null)

  const load = useCallback(async (range: number) => {
    setError(null)
    setReport(null)
    try {
      setReport(await adminVisitorsService.report(range))
    } catch (failure) {
      setError(failure instanceof VisitorsUnavailableError && failure.off ? 'off' : 'failed')
    }
  }, [])

  useEffect(() => {
    load(days)
  }, [days, load])

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="font-serif text-2xl font-light">Visitors</h1>
          <p className="text-sm text-zinc-faded">
            Other people on the site, from Vercel Web Analytics: admin pages and your own browsers are
            left out. Counting started on October 5, 2026.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-10 flex flex-wrap items-center gap-2">
          {RANGES.map((range) => (
            <button key={range.days} onClick={() => setDays(range.days)} className={chip(days === range.days)}>
              {range.label}
            </button>
          ))}
          <a
            href={DASHBOARD}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-sage transition-colors"
          >
            Vercel dashboard
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </div>

        {error === 'off' ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl italic">Not set up yet</p>
            <p className="mt-2 text-sm text-zinc-faded">
              The API has no Vercel token (the <code className="font-mono">vercel-analytics</code> secret).
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-faded">Vercel’s analytics is unavailable right now.</p>
            <button
              onClick={() => load(days)}
              className="mt-4 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !report ? (
          <div className="space-y-8" aria-label="Loading visitors">
            <div className="h-24 w-64 animate-pulse bg-paper-dark" />
            <div className="h-40 animate-pulse bg-paper-dark" />
          </div>
        ) : report.pageviews === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-faded">
            <Users size={28} aria-hidden="true" />
            <p className="font-serif text-xl italic">No visitors {days === 1 ? 'today' : 'in this range'} yet</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-16 gap-y-8">
              <Figure value={report.visitors} label="Visitors" />
              <Figure value={report.pageviews} label="Page views" />
            </div>

            {report.days.length > 1 && (
              <div className="mt-16">
                <DailyChart days={report.days} />
              </div>
            )}

            <div className="mt-16 grid gap-12 md:grid-cols-2">
              <TopList title="Pages" rows={report.pages} name={page} empty="No pages." />
              <TopList title="Came from" rows={report.referrers} name={referrer} empty="No referrers." />
              <TopList title="Countries" rows={report.countries} name={country} empty="No countries." />
              <TopList title="Devices" rows={report.devices} name={device} empty="No devices." />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
