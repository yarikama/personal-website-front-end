import { STORY } from './model'

const ROWS = [
  { last: 'none', back: 'the first record of the log', story: STORY.plain },
  { last: '<CKPT>', back: 'that <CKPT>', story: STORY.quiet },
  { last: '<END CKPT>', back: 'the <START CKPT> it closes', story: STORY.fuzzy },
  { last: '<START CKPT (…)>, no end', back: 'the earliest <START> of a transaction on its list', story: STORY.early },
]

// Where an undo log's recovery may stop, by the last checkpoint record it
// meets going back, with what each rule read in the café
export default function Rules() {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
          <th className="pb-3 pr-4 font-normal">Last checkpoint record</th>
          <th className="pb-3 pr-4 font-normal">Read back to</th>
          <th className="pb-3 text-right font-normal">Café</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.last} className="align-top">
            <td className="py-2 pr-4 font-mono text-[0.875rem] text-sage-ink">{row.last}</td>
            <td className="py-2 pr-4 font-serif text-lg font-light leading-snug text-ink">{row.back}</td>
            <td className="py-2 text-right font-mono text-[0.875rem] tabular-nums text-zinc-faded whitespace-nowrap">
              {row.story.read} of {row.story.written}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
