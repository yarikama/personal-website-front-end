import { Readout } from '../../components/explain/figure'
import { percent, two, type Scoring } from './model'
import Tokens from './Tokens'

// One chat-formatted example, token by token, and what its loss comes to
// when only the answers count or when every token does.
export default function Lab({ scoring, label }: { scoring: Scoring; label: string }) {
  const { tokens, scored, loss, promptShare } = scoring
  return (
    <div className="mx-auto max-w-[40rem]">
      <p className="sr-only">{label}</p>
      <Tokens tokens={tokens} />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Readout label="Scored" value={`${scored}/${tokens.length}`} />
        <Readout label="Mean loss" value={two(loss)} accent />
        <Readout label="From prompt" value={percent(promptShare)} />
      </div>
    </div>
  )
}
