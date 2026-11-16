/**
 * Hairline's engine, vendored: isometric line figures that answer the pointer.
 *
 * iso.ts, motion.ts, stage.ts and styles.ts are packages/hairline/src/core of
 * https://github.com/lucasmarkes/hairline at 034f4bf, unchanged (MIT, see
 * LICENSE here). The npm package exports only its own figures, not this core,
 * so a figure of our own needs a copy. Update by copying the four files again.
 */
export * from './iso'
export * from './motion'
export * from './stage'
export { inject } from './styles'
