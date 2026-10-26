import type { LearningEdge, LearningEdgeType, LearningGraph, LearningNode, LearningNodeKind } from '../types'

// A sample graph, shown while the real one has no published nodes yet: the
// road from the maths to training and serving a language model.
const node = (
  slug: string,
  kind: LearningNodeKind,
  title: string,
  summary: string,
  ref: string | null = kind === 'learning' ? `/learnings/${slug}` : null
): LearningNode => ({ slug, kind, title, summary, ref, tags: TAGS[slug] ?? [], previewImage: null, published: true })

// Tags cut across the concepts: optimization runs from the maths to RL
const TAGS: Record<string, string[]> = {
  'linear-algebra': ['math'],
  probability: ['math'],
  'gradient-descent': ['math', 'optimization'],
  backprop: ['optimization'],
  attention: ['nlp'],
  transformer: ['nlp'],
  tokenization: ['nlp'],
  pretraining: ['nlp', 'optimization'],
  'kv-cache': ['systems'],
  serving: ['systems'],
  sft: ['optimization'],
  dpo: ['optimization', 'rl'],
  grpo: ['optimization', 'rl'],
  'attention-paper': ['nlp'],
  'dpo-paper': ['rl'],
  'grpo-paper': ['rl'],
}

const nodes: LearningNode[] = [
  node('foundations', 'concept', 'Foundations', 'The maths every model after it leans on.'),
  node('deep-learning', 'concept', 'Deep learning', 'Networks of many layers, and how they learn.'),
  node('language-models', 'concept', 'Language models', 'Predicting the next token, at scale.'),
  node('post-training', 'concept', 'Post-training', 'Turning a pretrained model into a useful one.'),

  node('linear-algebra', 'learning', 'Linear algebra', 'Vectors, matrices and the shapes a network computes with.'),
  node('probability', 'learning', 'Probability', 'Distributions, likelihood and what a loss is measuring.'),
  node('gradient-descent', 'learning', 'Gradient descent', 'Walking downhill on a loss surface, one step at a time.'),
  node('neural-networks', 'learning', 'Neural networks', 'Layers of weighted sums and nonlinearities.'),
  node('backprop', 'learning', 'Backpropagation', 'The chain rule, run backwards through the graph.'),
  node('attention', 'learning', 'Attention', 'Each token deciding which others to look at.'),
  node('transformer', 'learning', 'The transformer', 'Attention, MLPs and residuals, stacked.'),
  node('tokenization', 'learning', 'Tokenization', 'From text to the integers a model reads.'),
  node('pretraining', 'learning', 'Pretraining', 'Next-token prediction over a very large corpus.'),
  node('kv-cache', 'learning', 'The KV cache', 'Why generating one more token need not redo the rest.'),
  node('serving', 'learning', 'Serving with vLLM', 'Paged attention and batching on a single small GPU.'),
  node('sft', 'learning', 'Supervised fine-tuning', 'Teaching a format from examples of it.'),
  node('dpo', 'learning', 'DPO', 'Learning from pairs of answers, one preferred.'),
  node('grpo', 'learning', 'GRPO', 'Reinforcement learning against a reward that can be checked.'),

  node(
    'attention-paper',
    'external',
    'Attention Is All You Need',
    'Vaswani et al., 2017.',
    'https://arxiv.org/abs/1706.03762'
  ),
  node('dpo-paper', 'external', 'Direct Preference Optimization', 'Rafailov et al., 2023.', 'https://arxiv.org/abs/2305.18290'),
  node('grpo-paper', 'external', 'DeepSeekMath', 'Shao et al., 2024: where GRPO comes from.', 'https://arxiv.org/abs/2402.03300'),
]

const edges = (type: LearningEdgeType, pairs: string): LearningEdge[] =>
  pairs
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [source, target] = pair.split('>')
      return { source, target, type }
    })

export const demoGraph: LearningGraph = {
  nodes,
  edges: [
    ...edges(
      'prerequisite',
      `linear-algebra>neural-networks probability>neural-networks gradient-descent>backprop
       neural-networks>backprop backprop>attention attention>transformer transformer>pretraining
       tokenization>pretraining transformer>kv-cache kv-cache>serving pretraining>sft sft>dpo dpo>grpo`
    ),
    ...edges(
      'part_of',
      `linear-algebra>foundations probability>foundations gradient-descent>foundations
       neural-networks>deep-learning backprop>deep-learning attention>language-models
       transformer>language-models tokenization>language-models pretraining>language-models
       kv-cache>language-models serving>language-models sft>post-training dpo>post-training
       grpo>post-training`
    ),
    ...edges('related', 'attention>attention-paper dpo>dpo-paper grpo>grpo-paper probability>dpo'),
  ],
}
