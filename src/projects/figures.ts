// Projects whose cover is a drawn, moving figure instead of the image stored
// with the project. The stored cover stays the share image (og:image).
import { grow } from '../components/figures/grow'
import { keep } from '../components/figures/keep'
import { onebox } from '../components/figures/onebox'
import { rocker } from '../components/figures/rocker'
import type { FigureDef } from '../components/figures/types'

export const figures: Record<string, FigureDef> = {
  'homelab-self-hosted-llm-platform': onebox,
  'prompt-aware-image-token-pruning': keep,
  'defending-llm-agents-against-tool-schema-poisoning': rocker,
  'cross-size-generalization-gnn-job-shop-scheduling': grow,
}

export const figureOf = (slug: string | undefined) => (slug ? figures[slug] : undefined)
