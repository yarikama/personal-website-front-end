import { usePlay } from '../../components/explain/useLoop'
import Menu, { MenuHeader } from './Menu'
import { MENU, MENU_TABLES, STORY_PLAY, STORY_ROUNDS } from './model'

export type Show = 'menu' | 'even' | 'together' | 'rounds' | 'settled' | 'named'

// Real milliseconds a round takes in the story
const PACE = 1100

function Rounds() {
  const played = usePlay(STORY_PLAY, PACE)
  return (
    <>
      <MenuHeader left={`Round ${Math.floor(played)}`} right="Tally, re-weigh, again" />
      <Menu pairs={MENU} tables={MENU_TABLES} round={played} />
    </>
  )
}

// The story's menu, as each step shows it
export default function Story({ show }: { show: Show }) {
  if (show === 'rounds') return <Rounds />
  const header =
    show === 'menu'
      ? { left: 'Le menu', right: 'No dictionary' }
      : show === 'even' || show === 'together'
        ? { left: 'Round 0', right: 'Every link as likely' }
        : show === 'settled'
          ? { left: `Round ${STORY_ROUNDS}`, right: 'Each word has a partner' }
          : { left: `EM round ${STORY_ROUNDS}`, right: 'Alignments, weighted by t(f | e)' }
  return (
    <>
      <MenuHeader {...header} />
      <Menu
        pairs={MENU}
        tables={MENU_TABLES}
        round={show === 'settled' || show === 'named' ? STORY_ROUNDS : 0}
        lines={show !== 'menu'}
        marked={show === 'together' ? ['tea', 'thé'] : []}
      />
    </>
  )
}
