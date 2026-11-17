import { END, START } from './model'

// The width every drawing on the page is laid out in: narrow, so the
// labels stay readable on a phone
export const WIDTH = 300

// How a token reads: in the story, "start" and "end"; once named, the
// tokens <s> and </s>
export const tokenName = (token: string, named: boolean) =>
  token === START ? (named ? START : 'start') : token === END ? (named ? END : 'end') : token
