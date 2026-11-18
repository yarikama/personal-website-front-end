import { useId } from 'react'
import { Readout } from '../../components/explain/figure'
import { cellSize, INPUTS, LOOKS, OUTLINES, VIEWS, type Box, type Mode } from './model'

const WIDTH = 360
const HEIGHT = 150
const TOP = 26
// The three panels: the whole picture, a close look, and the close look as the encoder gets it
const WHOLE = { x: 0, size: 100 }
const CLOSE = { x: 116, size: 116 }
const TOKENS = { x: 244, size: 116 }

const label = 'fill-zinc-faded font-mono text-[10px] uppercase tracking-widest'

// What one picture becomes under one way of cutting it: its token count, how
// much of the picture each token stands for, and a close look at both
export default function Budget({ input: k, mode }: { input: number; mode: Mode }) {
  const id = useId()
  const input = INPUTS[k]
  const v = VIEWS[mode][k]
  const g = v.grid
  const { look } = input

  // The whole picture as fed in: padded to a square when fixed
  const frame = mode === 'Fixed' ? { x: g.x0, y: g.y0, w: g.cols * g.cellW, h: g.rows * g.cellH } : { x: 0, y: 0, w: input.width, h: input.height }
  const scale = WHOLE.size / Math.max(frame.w, frame.h)
  const left = WHOLE.x + (WHOLE.size - frame.w * scale) / 2 - frame.x * scale
  const top = TOP + (WHOLE.size - frame.h * scale) / 2 - frame.y * scale
  const gridLines = g.cellW * scale >= 4 && g.cellH * scale >= 4

  // The close look: `look` drawn into a square of CLOSE.size
  const zoom = CLOSE.size / look.size
  const inLook = (b: { x: number; y: number; w: number; h: number }) =>
    b.x < look.x + look.size && b.x + b.w > look.x && b.y < look.y + look.size && b.y + b.h > look.y
  const boxes = input.boxes.filter(inLook)

  // The close look as the encoder gets it: blurred where the picture was
  // shrunk, then the token squares over it
  const pixels = LOOKS[mode][k]
  const cellLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  if (g.cellW * zoom >= 5) {
    const c0 = Math.ceil((look.x - g.x0) / g.cellW)
    const c1 = Math.floor((look.x + look.size - g.x0) / g.cellW)
    for (let c = Math.max(0, c0); c <= Math.min(g.cols, c1); c++) {
      const x = TOKENS.x + (g.x0 + c * g.cellW - look.x) * zoom
      cellLines.push({ x1: x, x2: x, y1: TOP + (g.y0 - look.y) * zoom, y2: TOP + (g.y0 + g.rows * g.cellH - look.y) * zoom })
    }
    const r0 = Math.ceil((look.y - g.y0) / g.cellH)
    const r1 = Math.floor((look.y + look.size - g.y0) / g.cellH)
    for (let r = Math.max(0, r0); r <= Math.min(g.rows, r1); r++) {
      const y = TOP + (g.y0 + r * g.cellH - look.y) * zoom
      cellLines.push({ y1: y, y2: y, x1: TOKENS.x + (g.x0 - look.x) * zoom, x2: TOKENS.x + (g.x0 + g.cols * g.cellW - look.x) * zoom })
    }
  }

  const closeBox = (b: Box, i: number, x0: number) => (
    <rect
      key={i}
      x={x0 + (b.x - look.x) * zoom}
      y={TOP + (b.y - look.y) * zoom}
      width={b.w * zoom}
      height={b.h * zoom}
      className="fill-ink"
      fillOpacity={b.ink}
    />
  )

  return (
    <div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Visual tokens" value={v.tokens.toLocaleString('en-US')} accent />
        <Readout label="One token covers" value={`${cellSize(g)} px`} />
        <Readout label="Tokens on padding" value={v.padding.toLocaleString('en-US')} />
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-5 w-full max-w-[34rem]"
        role="img"
        aria-label={`${input.name}, ${input.width} by ${input.height} pixels, becomes ${v.tokens} visual tokens, each standing for ${cellSize(g)} pixels of it${
          v.padding ? `, ${v.padding} of them on padding` : ''
        }. A close look at part of it beside the same part as the encoder gets it${pixels ? ', blurred by the shrinking' : ''}.`}
      >
        <defs>
          <clipPath id={`${id}-close`}>
            <rect x={CLOSE.x} y={TOP} width={CLOSE.size} height={CLOSE.size} />
          </clipPath>
          <clipPath id={`${id}-tokens`}>
            <rect x={TOKENS.x} y={TOP} width={TOKENS.size} height={TOKENS.size} />
          </clipPath>
          <pattern id={`${id}-pad`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={5} className="stroke-zinc-300" strokeWidth={1.5} />
          </pattern>
        </defs>

        <text x={WHOLE.x} y={12} className={label}>
          Fed in
        </text>
        <text x={CLOSE.x} y={12} className={label}>
          Close look
        </text>
        <text x={TOKENS.x} y={12} className={label}>
          Encoder gets
        </text>

        {/* The whole picture: the padding first, then the picture's ink */}
        {mode === 'Fixed' && (
          <rect
            x={left + frame.x * scale}
            y={top + frame.y * scale}
            width={frame.w * scale}
            height={frame.h * scale}
            fill={`url(#${id}-pad)`}
            className="stroke-zinc-400"
            strokeWidth={0.75}
          />
        )}
        <rect x={left} y={top} width={input.width * scale} height={input.height * scale} className="fill-paper stroke-zinc-400" strokeWidth={0.75} />
        {(input.boxes.length > 300 ? OUTLINES[k] : input.boxes).map((b, i) => (
          <rect
            key={i}
            x={left + b.x * scale}
            y={top + b.y * scale}
            width={Math.max(0.3, b.w * scale)}
            height={Math.max(0.3, b.h * scale)}
            className="fill-ink"
            fillOpacity={b.ink}
          />
        ))}
        {gridLines && (
          <g className="stroke-zinc-400" strokeWidth={0.4}>
            {Array.from({ length: g.cols + 1 }, (_, c) => (
              <line
                key={`c${c}`}
                x1={left + (g.x0 + c * g.cellW) * scale}
                x2={left + (g.x0 + c * g.cellW) * scale}
                y1={top + g.y0 * scale}
                y2={top + (g.y0 + g.rows * g.cellH) * scale}
              />
            ))}
            {Array.from({ length: g.rows + 1 }, (_, r) => (
              <line
                key={`r${r}`}
                y1={top + (g.y0 + r * g.cellH) * scale}
                y2={top + (g.y0 + r * g.cellH) * scale}
                x1={left + g.x0 * scale}
                x2={left + (g.x0 + g.cols * g.cellW) * scale}
              />
            ))}
          </g>
        )}
        {/* Where the close look is */}
        <rect
          x={left + look.x * scale}
          y={top + look.y * scale}
          width={Math.max(3, look.size * scale)}
          height={Math.max(3, look.size * scale)}
          className="fill-none stroke-sage"
          strokeWidth={1.5}
        />

        {/* The close look, as the eye sees it */}
        <g clipPath={`url(#${id}-close)`}>
          <rect x={CLOSE.x} y={TOP} width={CLOSE.size} height={CLOSE.size} fill={`url(#${id}-pad)`} />
          <rect
            x={CLOSE.x - look.x * zoom}
            y={TOP - look.y * zoom}
            width={input.width * zoom}
            height={input.height * zoom}
            className="fill-paper"
          />
          {boxes.map((b, i) => closeBox(b, i, CLOSE.x))}
        </g>
        <rect x={CLOSE.x} y={TOP} width={CLOSE.size} height={CLOSE.size} className="fill-none stroke-sage" strokeWidth={1.5} />

        {/* The same square as the encoder gets it, with the token squares over it */}
        <g clipPath={`url(#${id}-tokens)`}>
          <rect x={TOKENS.x} y={TOP} width={TOKENS.size} height={TOKENS.size} fill={`url(#${id}-pad)`} />
          <rect
            x={TOKENS.x - look.x * zoom}
            y={TOP - look.y * zoom}
            width={input.width * zoom}
            height={input.height * zoom}
            className="fill-paper"
          />
          {pixels
            ? pixels.ink.map((ink, i) => {
                const p = pixels.grid
                const c = i % p.cols
                const r = Math.floor(i / p.cols)
                return (
                  <rect
                    key={i}
                    x={TOKENS.x + (p.x0 + c * p.cellW - look.x) * zoom}
                    y={TOP + (p.y0 + r * p.cellH - look.y) * zoom}
                    width={p.cellW * zoom + 0.3}
                    height={p.cellH * zoom + 0.3}
                    className="fill-ink"
                    fillOpacity={ink}
                  />
                )
              })
            : boxes.map((b, i) => closeBox(b, i, TOKENS.x))}
          <g className="stroke-sage" strokeWidth={1}>
            {cellLines.map((l, i) => (
              <line key={i} {...l} />
            ))}
          </g>
        </g>
        <rect x={TOKENS.x} y={TOP} width={TOKENS.size} height={TOKENS.size} className="fill-none stroke-sage" strokeWidth={1.5} />
      </svg>
    </div>
  )
}
