// The lines of a code sample written as a template literal: without the
// blank lines around it, and without the indentation every line shares, so
// it can be indented to sit with the code around it
export function codeLines(code: string): string[] {
  const lines = code.replace(/\t/g, '    ').split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const shared = Math.min(...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length))
  return lines.map((line) => line.slice(shared).trimEnd())
}

export type TokenKind = 'keyword' | 'string' | 'comment' | 'number' | 'plain'

export interface Token {
  text: string
  kind: TokenKind
}

const KEYWORDS = new Set([
  'and', 'as', 'break', 'class', 'continue', 'def', 'elif', 'else', 'False', 'for', 'from', 'if', 'import', 'in',
  'is', 'lambda', 'None', 'not', 'or', 'pass', 'return', 'True', 'while', 'with', 'yield',
])

// A string, a comment, a number or a word; everything between is plain
const PIECES = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#.*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g

// One line of Python, cut into the pieces the code block colours: enough
// to read by, not a parser. A string or comment never spans lines here.
export function tokens(line: string): Token[] {
  const out: Token[] = []
  const add = (text: string, kind: TokenKind) => {
    if (!text) return
    const last = out[out.length - 1]
    if (last && last.kind === kind) last.text += text
    else out.push({ text, kind })
  }
  let at = 0
  for (const match of line.matchAll(PIECES)) {
    add(line.slice(at, match.index), 'plain')
    const [text, string, comment, number, word] = match
    add(text, string ? 'string' : comment ? 'comment' : number ? 'number' : word && KEYWORDS.has(word) ? 'keyword' : 'plain')
    at = match.index + text.length
  }
  add(line.slice(at), 'plain')
  return out
}
