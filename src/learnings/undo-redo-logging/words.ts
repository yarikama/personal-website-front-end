import { recordText, type LogRecord } from './model'

const STORY_NAMES: Record<string, string> = { A: 'Trips', B: 'Food' }
const storyName = (x: string) => STORY_NAMES[x] ?? x

// Story words or system words for the same drawing: the reveal relabels it
export const WORDS = {
  story: {
    memory: 'Scratch pad',
    disk: 'Ledger',
    log: 'Notebook',
    tail: 'Not noted yet',
    lost: 'lost',
    noLog: 'no notebook',
    name: storyName,
    record: (r: LogRecord) =>
      r.kind === 'update'
        ? `${storyName(r.x)} ${r.old !== undefined ? `was ${r.old}` : `now ${r.new}`}`
        : r.kind === 'commit'
          ? 'Done'
          : r.kind === 'abort'
            ? 'Given up'
            : 'Start',
  },
  system: {
    memory: 'Memory',
    disk: 'Disk',
    log: 'Log on disk',
    tail: 'Log tail',
    lost: 'wiped',
    noLog: 'no log',
    name: (x: string) => x,
    record: recordText,
  },
}
export type Words = keyof typeof WORDS
