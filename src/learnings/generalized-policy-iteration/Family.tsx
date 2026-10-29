import { Link } from 'react-router-dom'

interface Member {
  slug: string
  name: string
  // How much judging happens between pushes on the policy
  grain: string
  judge: string
  improve: string
}

// The methods on this site, each as its two pulls
const FAMILY: Member[] = [
  {
    slug: 'policy-iteration',
    name: 'Policy iteration',
    grain: 'until settled',
    judge: 'Sweep the policy’s own equation until the values stop moving.',
    improve: 'Switch every state to its best move by those values.',
  },
  {
    slug: 'value-iteration',
    name: 'Value iteration',
    grain: 'one sweep',
    judge: 'One sweep of backups.',
    improve: 'Inside the same sweep: each backup uses the best move.',
  },
  {
    slug: 'monte-carlo-control',
    name: 'Monte Carlo',
    grain: 'one episode',
    judge: 'Average the returns that followed each move.',
    improve: 'Choose by those averages, still exploring now and then.',
  },
  {
    slug: 'sarsa',
    name: 'Sarsa',
    grain: 'one step',
    judge: 'Nudge Q(s, a) toward the reward plus the score of the move taken next.',
    improve: 'ε-greedy on Q: the very next choice already uses the new score.',
  },
  {
    slug: 'q-learning',
    name: 'Q-learning',
    grain: 'one step',
    judge: 'Nudge Q(s, a) toward the reward plus the best next score: it judges the greedy policy, not the one acting.',
    improve: 'ε-greedy on Q, as in Sarsa.',
  },
  {
    slug: 'deep-q-networks',
    name: 'Deep Q-network',
    grain: 'one minibatch',
    judge: 'Move the network’s weights toward targets from a frozen copy, on replayed moves.',
    improve: 'ε-greedy on the network’s guesses.',
  },
  {
    slug: 'reinforce',
    name: 'REINFORCE',
    grain: 'one episode',
    judge: 'Nothing learned: the episode’s return, against a baseline, does the judging.',
    improve: 'Make each move more likely in proportion to how much better than usual it went.',
  },
  {
    slug: 'actor-critic',
    name: 'Actor–critic',
    grain: 'one step',
    judge: 'The critic: V(s) moves toward r + V(s′).',
    improve: 'The actor: each habit moves with the critic’s verdict δ.',
  },
  {
    slug: 'ddpg',
    name: 'DDPG',
    grain: 'one minibatch',
    judge: 'The critic: Q(s, a) moves toward a target from frozen copies.',
    improve: 'The actor climbs the critic’s slope.',
  },
]

const head = 'font-mono text-[0.7rem] uppercase tracking-widest text-zinc-400'

// The family of methods, each split into what pulls the values toward the
// policy and what pulls the policy toward the values. On a phone each
// method is a block; wider, a table.
export default function Family() {
  return (
    <div className="text-sm leading-snug">
      <div className="hidden sm:grid sm:grid-cols-[10rem_1fr_1fr] sm:gap-x-6 pb-2">
        <span className={head}>Method · grain</span>
        <span className={head}>Evaluation: values → policy’s</span>
        <span className={head}>Improvement: policy → greedy</span>
      </div>
      <ul>
        {FAMILY.map((member) => (
          <li
            key={member.slug}
            className="grid grid-cols-1 gap-y-1.5 border-t border-zinc-200 py-3 dark:border-zinc-200/15 sm:grid-cols-[10rem_1fr_1fr] sm:gap-x-6"
          >
            <span>
              <Link to={`/learnings/${member.slug}`} className="font-serif text-lg text-sage hover:underline">
                {member.name}
              </Link>
              <span className="block font-mono text-[0.75rem] text-zinc-400">{member.grain}</span>
            </span>
            <span className="text-ink">
              <span className={`${head} sm:hidden`}>Evaluation · </span>
              {member.judge}
            </span>
            <span className="text-zinc-faded">
              <span className={`${head} sm:hidden`}>Improvement · </span>
              {member.improve}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
