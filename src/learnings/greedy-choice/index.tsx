import Article from '../../components/explain/Article'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Day from './Day'
import Lab from './Lab'
import Scan from './Scan'
import { book, BUSY, clock, finishes, most, OFFSITE, SYNC, taken, trialHits, TRIALS, WEDNESDAY } from './model'

const ORDINAL = ['1st', '2nd', '3rd', '4th']

export default function GreedyChoice() {
  // The story's numbers, from the runs themselves
  const offsite = { got: book(OFFSITE, 'start').length, fit: most(OFFSITE).length }
  const sync = { got: book(SYNC, 'shortest').length, fit: most(SYNC).length }
  const busy = { got: book(BUSY, 'clashes').length, fit: most(BUSY).length }
  // When the room is free again after each booking, ends first against fewest clashes
  const ahead = finishes(BUSY, taken(book(BUSY, 'end')))
  const behind = finishes(BUSY, taken(book(BUSY, 'clashes')))
  const rates = trialHits()
  const randomDays = TRIALS.days.toLocaleString('en-US')

  return (
    <Article
      kicker="Algorithms · Greedy"
      title="Finish first"
      promise="One room, a day of meeting requests that overlap, and you want to say yes to as many as you can. Which one do you book first?"
      takeaway={
        <>
          To fit the most into one room, keep booking the meeting that <em>ends first</em>; and trust a greedy rule
          only once it is proved, because one small counterexample is enough to sink it.
        </>
      }
      sources={[
        {
          title: 'Algorithm Design',
          by: 'Jon Kleinberg and Éva Tardos, Pearson, 2005',
          part: 'Chapter 4, “Greedy Algorithms”, §4.1 “Interval Scheduling: The Greedy Algorithm Stays Ahead”, and §4.2 for the exchange argument',
          url: 'https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003259',
        },
        {
          title: 'Introduction to Algorithms',
          by: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest and Clifford Stein, 4th edition, MIT Press, 2022',
          part: 'Chapter 15, “Greedy Algorithms”, §15.1 “An activity-selection problem”',
          url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        },
        {
          title: 'Algorithms',
          by: 'Jeff Erickson, 2019',
          part: 'Chapter 4, “Greedy Algorithms”',
          url: 'https://jeffe.cs.illinois.edu/teaching/algorithms/',
        },
        {
          title: 'COMP 582: Graduate Design and Analysis of Algorithms',
          by: 'Rice University, Spring 2026',
          part: 'Greedy algorithms',
        },
      ]}
    >
      <Predict
        question="Each time, you’ll book one request, turn away everything that clashes with it, and repeat. Which rule always books the most meetings?"
        options={[
          { label: 'The shortest' },
          { label: 'The one that starts first' },
          { label: 'The one with fewest clashes' },
          { label: 'The one that ends first', right: true },
        ]}
        reveal={
          <>
            The one that ends first. The other three each sound sensible, and each loses on a small day you are about
            to see. Fewest clashes is the hardest one to catch out.
          </>
        }
      />

      <h2>The booking sheet</h2>

      <Steps
        readable
        say={[
          <>You keep the booking sheet for the one meeting room on your floor. Two meetings can’t share it.</>,
          <>
            Book whoever starts first? The offsite starts at 9:00 and holds the room all day, so every short meeting is
            turned away: {offsite.got} booked when {offsite.fit} fit.
          </>,
          <>
            Book the shortest? A one-hour sync sits across the change-over between two long meetings, and both are
            turned away: {sync.got} booked when {sync.fit} fit.
          </>,
          <>
            Book the one that clashes with the fewest others? It’s harder to fool, but on this busy day it takes a 12:30
            talk that clashes with only two, the two it needed: {busy.got} when {busy.fit} fit.
          </>,
          <>
            Book whichever ends first, then whichever ends first of what is still free. The room is free again as early
            as it can be, and all {busy.fit} fit.
          </>,
          <>
            Each meeting is an <strong>interval</strong> of time, from a start s to a finish f, and the room is one
            resource. Book one, drop what clashes, repeat, never taking a booking back: that is a{' '}
            <strong>greedy algorithm</strong>, and this problem is <strong>interval scheduling</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Day key="sheet" day={OFFSITE} rule={null} />
          ) : step === 1 ? (
            <Day key="start" day={OFFSITE} rule="start" />
          ) : step === 2 ? (
            <Day key="shortest" day={SYNC} rule="shortest" />
          ) : step === 3 ? (
            <Day key="clashes" day={BUSY} rule="clashes" pace={1000} />
          ) : step === 4 ? (
            <Day key="end" day={BUSY} rule="end" pace={1000} />
          ) : (
            <Day key="named" day={BUSY} rule="end" pace={1} named />
          )
        }
      </Steps>

      <h2>Why ending first can’t lose</h2>
      <p>
        The appeal is easy to say: the meeting that ends first hands the room back soonest, which leaves the most of the
        day for everyone else. But the losing rules had appealing stories too. What sets this one apart is a reason that
        holds on every possible day, not only on the days we tried.
      </p>
      <p>
        Line two schedules up booking by booking, and after each one ask when the room is free again. On the busy day,
        ends first against fewest clashes:
      </p>
      <Numbers
        words
        items={ahead.map((end, k) => ({
          label: `${ORDINAL[k]} booking`,
          value: clock(end),
          note: behind[k] === undefined ? 'vs none' : `vs ${clock(behind[k])}`,
        }))}
      />
      <p>
        Ends first is never behind, on any day, against any schedule. It can’t fall behind: if after k bookings it frees
        the room no later than the other schedule, then the other’s next meeting starts after both, so it is still
        open to ends first, which takes whatever open meeting finishes earliest. And it can’t run out early: if the other
        schedule had one meeting more, that meeting would still be open when ends first stopped, yet ends first only
        stops when nothing is open. This way of proving a greedy rule is called <strong>the greedy stays ahead</strong>.
      </p>
      <p>
        There is a second way in, an <strong>exchange argument</strong>. Take any best schedule and swap its first
        meeting for the one that ends first. The newcomer finishes no later, so nothing after it clashes, and the count
        is the same. Do it again on what follows, and the best schedule becomes the greedy one without losing a meeting.
      </p>
      <p>
        That is the lesson for every greedy rule: it is only as good as its proof. Four rules sounded sensible, and only
        one had an argument behind it. The fastest way to kill the others was a small day they got wrong.
      </p>

      <h2>Try to break a rule</h2>
      <p>
        Pick a rule and a day and watch it book. Tap a meeting to cancel it, and see whether the rule recovers. Then try
        random days.
      </p>
      <Figure
        readable
        caption={
          <>
            The thin outlined row is a best schedule, found by trying every set of meetings. Cancel the 12:30 talk on the
            busy day and fewest clashes fits all four. On {randomDays} random days, it never lost once.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`Fewest clashes booked the most that fit on ${rates.clashes === TRIALS.days ? 'all' : `${rates.clashes} of`} ${randomDays} random days. Is it a correct rule?`}
        options={[
          { label: 'Yes: that is proof enough' },
          { label: 'Yes, for small days' },
          { label: 'No: one day it loses is enough', right: true },
          { label: 'Can’t tell: try more days' },
        ]}
        reveal={
          <>
            Correct means right on every day, and the busy day is a day it gets wrong. Random days almost never build the
            trap; someone had to build it on purpose. More random days wouldn’t settle it either way. Ends first is
            trusted not for its 100%, but because the stays-ahead argument covers days nobody has tried.
          </>
        }
      />

      <h2>The template</h2>
      <p>
        Ends first doesn’t need to recount anything as it goes. Sort the meetings by when they end, then walk the list
        once, keeping a meeting if it starts no earlier than the last one you kept ends. Here it is in Python, running
        on a fresh day.
      </p>
      <Figure
        readable
        caption={
          <>
            The lit line is the one running. Note the ≥ on line 5: a meeting that starts the moment the last one ends
            fits, as two do here. The list is sorted once, and each meeting is looked at once.
          </>
        }
      >
        <Scan day={WEDNESDAY} />
      </Figure>
      <p>
        Sorting n meetings takes O(n log n) time and the walk takes O(n), so the whole thing is O(n log n), with no
        need to compare any meeting against the ones already kept: last_end says all there is to know about them.
      </p>

      <h2>When to reach for it</h2>
      <ul>
        <li>
          <strong>Ask what keeps the most room for later.</strong> Ending first wins because it leaves the most of the
          day free. The same question finds greedy rules in other problems.
        </li>
        <li>
          <strong>Try to break a rule before you trust it.</strong> Sketch two or three intervals by hand. The days that
          sank “starts first” and “shortest” take a minute each to find.
        </li>
        <li>
          <strong>Then prove it.</strong> Show the rule stays ahead, or that swapping a best answer’s choice for the
          greedy one loses nothing. If neither goes through, suspect the rule.
        </li>
      </ul>

      <h2>The same pattern, other clothes</h2>
      <ul>
        <li>
          <strong>Fewest points to hit every interval</strong> (arrows through balloons, one visit per overlapping
          shift): sort by end, put a point at the first end, skip everything it hits, repeat.
        </li>
        <li>
          <strong>Fewest intervals to remove so none overlap</strong>: the total minus the most you can keep, so run the
          same scan and count what it skips.
        </li>
        <li>
          <strong>Every meeting held, in as few rooms as possible</strong>: a different greedy, by start time, reusing
          any room that is free; you need as many rooms as meetings that ever run at once.
        </li>
        <li>
          <strong>Meetings worth different amounts</strong>: here greedy fails, since one long valuable meeting can beat
          two short ones. Sort by end and use dynamic programming: for each meeting, the best with it or without it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="For one tennis court, a friend books the request that starts last, drops what clashes, and repeats, working back through the day. Does it fit the most games?"
        options={[
          { label: 'No: it’s starts first, which loses' },
          { label: 'Yes: it’s ends first, played backwards', right: true },
          { label: 'Only if no games touch' },
          { label: 'Only on days without long games' },
        ]}
        reveal={
          <>
            Run the clock backwards and every start becomes a finish: the game that starts last is the one that ends
            first on the reversed day. The stays-ahead argument works the same in reverse. Starts first lost because it
            grabbed the earliest start, which says nothing about how long the court stays taken. Starting last leaves the
            most of the day before it free, just as ending first leaves the most after.
          </>
        }
      />
    </Article>
  )
}
