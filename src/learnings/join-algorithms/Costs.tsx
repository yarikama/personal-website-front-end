import {
  chunks,
  costs,
  fitsInMemory,
  formatCount,
  graceFits,
  mergeAtOnce,
  partitionCount,
  partitionLimit,
  partitionPages,
  runCount,
  sortMergeIos,
  type Algorithm,
} from './model'

const NAMES: Record<Algorithm, string> = {
  nested: 'Block nested loop',
  onePass: 'One-pass hash',
  grace: 'Grace hash',
  hybrid: 'Hybrid hash',
  sortMerge: 'Sort-merge',
}

// The bars run to 6 times reading both tables once
const SCALE = 6
const TICKS = [1, 3, 5]

const n = formatCount
const times = (k: number) => (k === 1 ? 'once' : `${n(k)} times`)

// What each algorithm does with this memory, or why it can't
function note(algorithm: Algorithm, r: number, s: number, m: number): string {
  const fits = fitsInMemory(r, s, m)
  const parts = partitionCount(m)
  switch (algorithm) {
    case 'nested':
      return `S in ${n(chunks(s, m))} chunk${chunks(s, m) === 1 ? '' : 's'} of ${n(m - 1)} pages: R read ${times(chunks(s, m))}`
    case 'onePass':
      return fits ? `S fits in M − 1 = ${n(m - 1)} pages` : `S is ${n(s)} pages; memory holds ${n(m - 1)}`
    case 'grace':
      return graceFits(r, s, m)
        ? `${n(parts)} partitions; S’s are about ${n(partitionPages(s, m))} pages each`
        : `S’s partitions of ${n(partitionPages(s, m))} pages don’t fit: S must be ≤ ${n(partitionLimit(m))}`
    case 'hybrid':
      return fits
        ? 'All of S stays in memory: the one-pass join'
        : graceFits(r, s, m)
          ? `Keeps about ${n(m)} pages of S in memory as it partitions`
          : 'As Grace: the partitions don’t fit'
    case 'sortMerge':
      return mergeAtOnce(r, s, m)
        ? `${n(runCount(r, m))} + ${n(runCount(s, m))} runs, merged at once`
        : sortMergeIos(r, s, m) !== null
          ? `${n(runCount(r, m) + runCount(s, m))} runs are too many to merge at once: each table sorted first`
          : 'Sorting the larger table would need a third pass'
  }
}

// Each algorithm's page I/Os for tables of `r` and `s` pages (`s` the
// smaller) with `m` pages of memory, as bars in units of reading both once;
// the cheapest in sage, those that can't run this way dashed, with why
export default function Costs({ r, s, m }: { r: number; s: number; m: number }) {
  const all = costs(r, s, m)
  const least = Math.min(...all.flatMap((c) => (c.ios === null ? [] : [c.ios])))

  return (
    <div>
      <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        Page I/Os, and how many times reading both tables once
      </p>
      <div className="mt-4 flex flex-col gap-5">
        {all.map(({ algorithm, ios }) => {
          const width = ios === null ? 0 : Math.min(ios / (r + s), SCALE) / SCALE
          const best = ios === least
          return (
            <div key={algorithm}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[0.875rem]">
                <span className={`uppercase tracking-widest ${best ? 'text-sage-ink' : 'text-ink'}`}>{NAMES[algorithm]}</span>
                <span className={`tabular-nums ${ios === null ? 'text-zinc-faded' : best ? 'text-sage-ink' : 'text-ink'}`}>
                  {ios === null ? (algorithm === 'onePass' ? 'doesn’t fit' : 'needs more passes') : `${n(ios)} · ${Number((ios / (r + s)).toFixed(1))}×`}
                </span>
              </div>
              <div
                className={`relative mt-1.5 h-4 rounded-full ${
                  ios === null ? 'border border-dashed border-zinc-400' : 'bg-zinc-200/60 dark:bg-zinc-200/10'
                }`}
              >
                {ios !== null && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${best ? 'bg-sage' : 'bg-ink/35'}`}
                    style={{ width: `${Math.max(width * 100, 1.5)}%` }}
                  />
                )}
                {TICKS.map((tick) => (
                  <span
                    key={tick}
                    className="absolute inset-y-0 w-0.5 bg-paper/80"
                    style={{ left: `${(tick / SCALE) * 100}%` }}
                    aria-hidden
                  />
                ))}
                {ios !== null && ios / (r + s) > SCALE && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[0.75rem] leading-none text-paper">
                    →
                  </span>
                )}
              </div>
              <p className={`mt-1.5 text-sm ${ios === null ? 'text-ink' : 'text-zinc-faded'}`}>{note(algorithm, r, s, m)}</p>
            </div>
          )
        })}
      </div>
      <div className="relative mt-2 h-5 font-mono text-[0.75rem] text-zinc-faded" aria-hidden>
        {TICKS.map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${(tick / SCALE) * 100}%` }}>
            {tick}×
          </span>
        ))}
      </div>
    </div>
  )
}
