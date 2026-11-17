import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import ClubGrid from './ClubGrid'
import CompletionLab from './CompletionLab'
import FriendsGrid from './FriendsGrid'
import {
  cells,
  CLUB,
  CLUB_RUN,
  count,
  FILMS,
  FRIENDS,
  GUESS,
  LAB,
  LAB_OVERFIT,
  LAB_START,
  labRun,
  miss,
  NETFLIX,
  parameters,
  PENALTIES,
  percent,
  SIZES,
  SONGS,
  STORY_MASK,
  STORY_ROUNDS,
  thousands,
  type Penalty,
} from './model'

// Big counts in words: 8.5 billion, 25 million
const roughly = (x: number) =>
  x >= 1e9 ? `${+(x / 1e9).toFixed(1)} billion` : x >= 1e6 ? `${+(x / 1e6).toFixed(1)} million` : thousands(x)

const GUESS_NUMBERS = parameters(GUESS.users, GUESS.movies, GUESS.k)
const STORY_SEEN = count(STORY_MASK)
const STORY_CELLS = FRIENDS.length * FILMS.length
const GOOD = labRun(LAB_START.share, LAB_START.k, LAB_START.lambda)
const OVER = labRun(LAB_OVERFIT.share, LAB_OVERFIT.k, LAB_OVERFIT.lambda)
const SONG_NUMBERS = parameters(SONGS.listeners, SONGS.songs, SONGS.k)
const SONG_CELLS = cells(SONGS.listeners, SONGS.songs)
const NETFLIX_CELLS = cells(NETFLIX.users, NETFLIX.movies)

export default function MatrixCompletion() {
  const [share, setShare] = useState(LAB_START.share)
  const [k, setK] = useState(LAB_START.k)
  const [lambda, setLambda] = useState<Penalty>(LAB_START.lambda)

  return (
    <Article
      kicker="Machine learning · Unsupervised learning"
      title="Matrix completion"
      promise="A film site knows how each user rated a handful of its films. How can it guess what they would think of all the others?"
      takeaway={
        <>
          When a few hidden tastes drive every rating, the grid is <em>low rank</em>: learn a short vector for each user
          and each movie from the ratings you have, and their dot products fill in the rest, from only a few percent of
          the cells.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Week 9 lecture notes, PCA: low-rank approximation, matrix completion and alternating minimization',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 14.5.1, “Principal Components” (the SVD as the best low-rank approximation)',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Statistical Learning with Sparsity',
          by: 'Trevor Hastie, Robert Tibshirani and Martin Wainwright, 2015',
          part: 'Chapter 7, “Matrix Decompositions, Approximations, and Completion”',
          url: 'https://hastie.su.domains/StatLearnSparsity/',
        },
        {
          title: 'Matrix Factorization Techniques for Recommender Systems',
          by: 'Yehuda Koren, Robert Bell and Chris Volinsky, IEEE Computer, 2009',
          part: 'Alternating least squares, the penalty, user and movie biases, and cold start',
          url: 'https://doi.org/10.1109/MC.2009.263',
        },
        {
          title: 'The Netflix Prize',
          by: 'James Bennett and Stan Lanning, KDD Cup and Workshop, 2007',
          part: 'The size of the prize’s data set',
        },
      ]}
    >
      <Predict
        question={`A site has ${thousands(GUESS.users)} users and ${thousands(GUESS.movies)} movies: a million possible ratings. Every user’s taste comes down to ${GUESS.k} hidden things. Roughly what share of the million must you see to fill in the rest almost exactly?`}
        options={[
          { label: 'About 90%' },
          { label: 'About half' },
          { label: `About ${percent(GUESS.enough)}`, right: true },
          { label: 'About 0.3%' },
        ]}
        reveal={
          <>
            About {percent(GUESS.enough)}. Seen at random, three ratings in a hundred fill the other 97 almost exactly,
            because the whole million is built from only {thousands(GUESS_NUMBERS)} numbers. At 0.3% there are fewer
            ratings than numbers to find, and nothing can work. Here is why so few will do.
          </>
        }
      />

      <h2>Films your friends haven’t seen</h2>

      <Steps
        readable
        say={[
          <>
            Four friends have rated the films they’ve seen out of 5 stars: {STORY_SEEN} ratings, and{' '}
            {STORY_CELLS - STORY_SEEN} blanks.
          </>,
          <>Each film is a mix of two things you might like: Heist is all action, Letters all romance, Mr & Mrs half of each.</>,
          <>Ana gave Heist 5 stars and Letters 1, so she gives action 5 stars and romance 1.</>,
          <>Paris is a quarter action and three quarters romance, so Ana would give it a quarter of 5 plus three quarters of 1: 2 stars.</>,
          <>
            Nobody tells you the mixes or the tastes, though. Start from a random guess, fit each friend’s tastes to the
            films, then each film’s mix to the friends, and repeat: in {STORY_ROUNDS} rounds every blank has settled.
          </>,
          <>
            Now a film club of {CLUB.size} people and {CLUB.size} films with only {thousands(CLUB_RUN.seenCount)} of the{' '}
            {thousands(CLUB.size * CLUB.size)} ratings. The same back and forth fills every blank, off by about{' '}
            {miss(CLUB_RUN.miss)} stars; guessing the average rating would be off by {miss(CLUB_RUN.missAverage)}.
          </>,
          <>
            That is a recommender. Each person is a <strong>user vector</strong> u, each film a{' '}
            <strong>movie vector</strong> v, the number of tastes is the <strong>rank</strong> k, the ratings you have are
            the <strong>observed entries</strong>, and each guess is u · v.
          </>,
        ]}
      >
        {(step) => (step <= 4 ? <FriendsGrid key={step} step={step} /> : <ClubGrid key={step} named={step === 6} />)}
      </Steps>

      <p>
        Nothing in the club needed the words action and romance. The two numbers for each person and each film are
        whatever explains the ratings best, and the ones a real system learns rarely mean anything you could name. What
        matters is that there are only a few of them.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a rating is the user’s numbers times the movie’s numbers, added up. Choose all the numbers so that,
        over only the ratings you have, the squared misses add up to as little as possible, plus a small penalty λ on
        how large the numbers grow:
      </p>
      <p className="text-center">
        minimise Σ<sub>seen (i, j)</sub> (r<sub>ij</sub> − u<sub>i</sub> · v<sub>j</sub>)² + λ (Σ ‖u<sub>i</sub>‖² + Σ
        ‖v<sub>j</sub>‖²)
      </p>
      <Clip
        src="matrix-completion/dot-to-fit"
        label="Ana's rating of Paris equals her stars for action times Paris's action, plus her stars for romance times Paris's romance. In symbols, r i j is about u i one times v j one plus u i two times v j two, which is the dot product u i dot v j. With Ana's 5 and 1 and Paris's quarter and three quarters, that is 5 times a quarter plus 1 times three quarters, which is 2. Fitting means choosing every u and v to make the sum, over the seen cells only, of r i j minus u i dot v j squared, plus lambda times the size of the vectors, as small as possible."
        caption="The story’s sum becomes a dot product, and the fit adds up its misses over the seen cells only. The blanks never enter it: they are filled afterwards, by the same dot product."
      />
      <p>
        Why can so few ratings be enough? Each one you see is one equation, and the unknowns are the vectors: k numbers
        for each of m users and n movies, (m + n)k in all, against m × n cells:
      </p>
      <Numbers
        words
        items={SIZES.map((size) => {
          const all = cells(size.users, size.movies)
          const numbers = parameters(size.users, size.movies, size.k)
          return {
            label: `${size.name}, k = ${size.k}`,
            value: `${roughly(numbers)} of ${roughly(all)}`,
            note: `${percent(numbers / all)} of the cells`,
          }
        })}
      />
      <p>
        Four friends save almost nothing, but at scale the saving is everything: the Netflix Prize released{' '}
        {roughly(NETFLIX.ratings)} ratings, {percent(NETFLIX.ratings / NETFLIX_CELLS)} of its grid, against{' '}
        {roughly(parameters(NETFLIX.users, NETFLIX.movies, 50))} numbers at rank 50. In practice you need several times
        more ratings than numbers, spread so that every user and every movie has at least k of its own: a row with no
        ratings has nothing to fit.
      </p>
      <p>
        With blanks there is no formula for the best vectors, but there is an easy way down, the one the story took. Hold
        every movie’s vector fixed, and each user’s is a small <Link to="/learnings/least-squares">least-squares</Link>{' '}
        fit to her own ratings, k unknowns. Then hold the users fixed and fit each movie. Neither half can raise the
        total, the same back and forth as <Link to="/learnings/k-means">k-means</Link>, so it settles: this is{' '}
        <strong>alternating least squares</strong>. With no blanks you would not need it, since the best rank-k fit is
        then the truncated SVD, the top directions <Link to="/learnings/pca">PCA</Link> finds (the Eckart–Young
        theorem). The blanks are what rule that out.
      </p>

      <h2>Try it on a grid</h2>
      <p>
        A {LAB.size} × {LAB.size} grid built from {LAB.k} hidden tastes plus a little noise, fitted from its average
        rating as real systems do. Choose how much of it you are given, how many numbers each row and column gets, and
        the penalty.
      </p>
      <Figure
        readable
        caption={
          <>
            At rank {LAB_START.k} with half the cells given, the hidden cells miss by {miss(GOOD.missHidden)} stars. Raise
            the rank to {LAB_OVERFIT.k} with the smallest penalty, and the given cells fit almost exactly (
            {miss(OVER.missSeen)}) while the hidden ones get worse ({miss(OVER.missHidden)}): there are now more numbers
            to fit than ratings. Below about a fifth of the cells, no rank does well.
          </>
        }
      >
        <CompletionLab run={labRun(share, k, lambda)} />
        <Controls>
          <Slider label="Cells given" value={share} min={0.1} max={0.9} step={0.05} onChange={setShare} format={percent} />
          <Slider label="Rank k" value={k} min={1} max={8} onChange={setK} />
          <Choice label="Penalty λ" options={PENALTIES} value={lambda} onChange={setLambda} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`You fit ${LAB_OVERFIT.k} numbers per user and per movie to a small set of ratings. It fits the ratings it was given almost exactly, off by ${miss(OVER.missSeen)} stars, but misses ratings you held back by ${miss(OVER.missHidden)}. What should you try first?`}
        options={[
          { label: 'More rounds of fitting' },
          { label: 'A lower rank, or a larger penalty', right: true },
          { label: 'A higher rank' },
          { label: 'Fill the blanks with the average first' },
        ]}
        reveal={
          <>
            A near-perfect fit on what it saw and a poor one on what it didn’t is overfitting: with{' '}
            {thousands(OVER.numbers)} numbers and {thousands(OVER.seenCount)} ratings, the vectors can bend to the noise
            in each rating. Fewer numbers, or a penalty that keeps them small, makes them explain the ratings with the
            tastes they share. More rounds only fit the seen ratings closer still.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Start from the averages.</strong> Take off the overall average rating, and each user’s and each
          movie’s own lean (a harsh critic, a film everyone likes), then factor what is left.
        </li>
        <li>
          <strong>Always add the penalty.</strong> It is the same λ as in{' '}
          <Link to="/learnings/ridge-regression">ridge regression</Link>, and it stops a user with three ratings from
          getting wild numbers that fit those three exactly.
        </li>
        <li>
          <strong>Choose k on ratings you held back.</strong> Hide a tenth of the ratings you have, fit on the rest, and
          keep the rank and penalty that miss the hidden ones least, as the lab’s last readout does.
        </li>
        <li>
          <strong>Plan for newcomers.</strong> A new user or film has no ratings, so nothing sets its vector: this is
          the <strong>cold start</strong> problem. Ask for a few ratings at sign-up, and fall back on what is popular or
          on what is known about the film until enough come in.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A music app has ${thousands(SONGS.listeners)} listeners and ${thousands(SONGS.songs)} songs, and tastes come down to about ${SONGS.k} things. What is the fewest ratings that could possibly pin the model down?`}
        options={[
          { label: `About ${thousands(SONGS.songs)}` },
          { label: `About ${thousands(SONG_NUMBERS)}`, right: true },
          { label: 'About 20,000' },
          { label: `All ${thousands(SONG_CELLS)}` },
        ]}
        reveal={
          <>
            ({thousands(SONGS.listeners)} + {thousands(SONGS.songs)}) × {SONGS.k} = {thousands(SONG_NUMBERS)} numbers to
            find, and each rating gives one equation, so fewer than that cannot be enough. In practice you want a few
            times more, with every listener and every song rated at least {SONGS.k} times, but that is still a small
            slice of all {thousands(SONG_CELLS)}.
          </>
        }
      />
    </Article>
  )
}
