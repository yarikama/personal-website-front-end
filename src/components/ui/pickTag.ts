// Which tag opens for a pointer at (x, y): the one across from it, whatever
// the height. Its x picks the tag whose span it is over, or the nearest
// across; only where a wrapped second row also lies across does y choose
// between the rows. So the pointer can sweep the tags from anywhere on the
// card, not only along the strip.
export function pickTag(boxes: { left: number; right: number; top: number; bottom: number }[], x: number, y: number) {
  let best = 0
  let bestAcross = Infinity
  let bestDown = Infinity
  boxes.forEach((box, i) => {
    const across = Math.max(0, box.left - x, x - box.right)
    const down = Math.abs((box.top + box.bottom) / 2 - y)
    if (across < bestAcross || (across === bestAcross && down < bestDown)) {
      best = i
      bestAcross = across
      bestDown = down
    }
  })
  return best
}
