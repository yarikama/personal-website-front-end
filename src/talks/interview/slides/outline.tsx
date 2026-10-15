import { Outline } from '../../../components/talk/primitives'

// The talk's four parts, then the Q&A that fills the rest of the hour
export function TalkOutline({ active }: { active?: string }) {
  return (
    <Outline
      active={active}
      headline={
        <>
          Four parts, <em>then</em> your questions.
        </>
      }
      after="Your questions"
    />
  )
}
