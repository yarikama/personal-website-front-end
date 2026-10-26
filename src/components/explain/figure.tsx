import { useId, type ReactNode } from 'react'

// A figure in a learning page: the drawing, the controls that change it,
// and a caption saying what to notice. Outside the prose styling, so its
// text keeps the sizes set here.
export function Figure({ children, caption }: { children: ReactNode; caption: ReactNode }) {
  return (
    <figure className="not-prose my-12 -mx-4 sm:mx-0 border-y sm:border border-zinc-200 dark:border-zinc-200/20 bg-paper-dark/40">
      <div className="p-4 sm:p-6">{children}</div>
      <figcaption className="border-t border-zinc-200 dark:border-zinc-200/20 px-4 sm:px-6 py-3 text-sm text-zinc-faded leading-relaxed">
        {caption}
      </figcaption>
    </figure>
  )
}

// A row of controls under a drawing; wraps on a phone
export function Controls({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">{children}</div>
}

const label = 'font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded'

export function Slider({
  label: name,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}) {
  const id = useId()
  return (
    <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
      <label htmlFor={id} className={`flex justify-between ${label}`}>
        <span>{name}</span>
        <span className="text-ink tabular-nums">{format(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-sage"
      />
    </div>
  )
}

// One of a few options, side by side
export function Choice<T extends string | number>({
  label: name,
  options,
  value,
  onChange,
  format = String,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  format?: (value: T) => string
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={name}>
      <span className={label}>{name}</span>
      <div className="flex">
        {options.map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={option === value}
            onClick={() => onChange(option)}
            className={`-ml-px first:ml-0 border px-3 py-1.5 font-mono text-[0.8rem] tabular-nums transition-colors ${
              option === value
                ? 'relative border-sage bg-sage/15 text-sage'
                : 'border-zinc-300 dark:border-zinc-200/20 text-zinc-faded hover:text-ink'
            }`}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Button({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
    >
      {children}
    </button>
  )
}

// A number the figure measured, with what it is
export function Readout({ label: name, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={label}>{name}</span>
      <span className={`font-serif text-3xl font-light tabular-nums ${accent ? 'text-sage' : 'text-ink'}`}>{value}</span>
    </div>
  )
}

// A few worked numbers side by side: the arithmetic, shown rather than
// written as a formula. `words` sizes the values for a few words each.
export function Numbers({
  items,
  words = false,
}: {
  items: { label: string; value: ReactNode; note?: string }[]
  words?: boolean
}) {
  return (
    <div
      className="not-prose my-8 grid border-y border-zinc-200 dark:border-zinc-200/20 text-center"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="px-2 py-5">
          <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{item.label}</p>
          <p className={`mt-2 font-serif font-light text-ink ${words ? 'text-2xl leading-tight' : 'text-4xl'}`}>{item.value}</p>
          {item.note && <p className="font-mono text-[0.8rem] text-zinc-400">{item.note}</p>}
        </div>
      ))}
    </div>
  )
}
