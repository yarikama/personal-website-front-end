import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { adminGithubService, type ContributionDay, type Contributions } from '../../services/api'

// The owner's GitHub contribution graph, as on the profile page: a column
// per week, Sunday at the top, shaded by GitHub's own 0-4 levels in sage.

// No contributions darker in the dark theme than the zinc-200 it remaps
// to, so the faintest green stands apart from it.
const SHADES = ['bg-zinc-200 dark:bg-[#1c1c1e]', 'bg-sage/30', 'bg-sage/55', 'bg-sage/80', 'bg-sage']
const MONTH = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
const DAY = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function weeks(days: ContributionDay[]): (ContributionDay | null)[][] {
  if (days.length === 0) return []
  // Pad the first week, should the year not start on a Sunday.
  const lead = new Date(`${days[0].date}T00:00:00Z`).getUTCDay()
  const cells: (ContributionDay | null)[] = [...Array(lead).fill(null), ...days]
  const out = []
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
  return out
}

function label(day: ContributionDay): string {
  const when = DAY.format(new Date(`${day.date}T00:00:00Z`))
  if (day.count === 0) return `No contributions on ${when}`
  return `${day.count} contribution${day.count === 1 ? '' : 's'} on ${when}`
}

export default function ContributionHeatmap() {
  const [data, setData] = useState<Contributions | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    adminGithubService
      .contributions()
      .then((result) => live && setData(result))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  if (failed) {
    return <p className="text-sm text-zinc-faded">GitHub’s graph is unavailable right now.</p>
  }
  if (!data) {
    return <div className="h-[120px] animate-pulse bg-paper-dark" aria-label="Loading the graph" />
  }

  const columns = weeks(data.days)
  // A month's name over the week it starts in. Under three weeks after the
  // last name, the later month wins (the first month is usually partial).
  const months: string[] = columns.map(() => '')
  let lastLabel = -3
  columns.forEach((week, i) => {
    const first = week.find(Boolean)
    const previous = columns[i - 1]?.find(Boolean)
    const starts = first && (!previous || first.date.slice(5, 7) !== previous.date.slice(5, 7))
    if (!first || !starts || i >= columns.length - 2) return
    if (i - lastLabel < 3) months[lastLabel] = ''
    months[i] = MONTH.format(new Date(`${first.date}T00:00:00Z`))
    lastLabel = i
  })

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-zinc-faded">
          <span className="text-ink">{data.total.toLocaleString('en-US')}</span> contributions in the last
          year
        </p>
        <a
          href={`https://github.com/${data.user}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-sage transition-colors"
        >
          github.com/{data.user}
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </div>

      {/* Scrolls sideways on a phone rather than shrinking the squares. */}
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] font-mono text-[11px] text-zinc-400" aria-hidden="true">
            {months.map((month, i) => (
              <span key={i} className="w-[11px] overflow-visible whitespace-nowrap">
                {month}
              </span>
            ))}
          </div>
          <div
            role="img"
            aria-label={`${data.total} GitHub contributions in the last year`}
            className="flex gap-[3px]"
          >
            {columns.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {week.map((day, j) =>
                  day ? (
                    <span
                      key={day.date}
                      title={label(day)}
                      className={`h-[11px] w-[11px] rounded-[2px] ${SHADES[day.level] ?? SHADES[0]}`}
                    />
                  ) : (
                    <span key={`pad-${j}`} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-2 flex items-center justify-end gap-1 font-mono text-[11px] text-zinc-400"
        aria-hidden="true"
      >
        Less
        {SHADES.map((shade) => (
          <span key={shade} className={`h-[11px] w-[11px] rounded-[2px] ${shade}`} />
        ))}
        More
      </div>
    </div>
  )
}
