// What kind of thing each project tag names, for its colour on the home
// page's featured cards. A tag not listed here is a field (what the project
// is about); add a tag here when it is a tool, a model or a method.

export type TagKind = 'infra' | 'model' | 'method' | 'field'

const KINDS: Record<Exclude<TagKind, 'field'>, string[]> = {
  // What the work runs on
  infra: ['Kubernetes', 'k3s', 'Argo CD', 'GPU Scheduling', 'CloudNativePG', 'Prometheus', 'Cloudflare Tunnel', 'Slurm', 'Docker', 'PostgreSQL', 'Redis', 'AWS', 'GCP'],
  // The models and frameworks it is built with
  model: ['vLLM', 'PyTorch', 'TensorFlow', 'LLaVA', 'CLIP ViT', 'Llama 3.1', 'React', 'FastAPI', 'LangChain', 'MediaPipe'],
  // The methods it applies
  method: ['Knowledge Distillation', 'Activation Steering', 'Graph Neural Networks', 'Reinforcement Learning', 'GRPO', 'PPO', 'RAG', 'Bayesian Optimization', 'Genetic Algorithm', 'Q-Learning', 'DQN'],
}

const byTag = new Map<string, TagKind>()
for (const [kind, tags] of Object.entries(KINDS)) for (const tag of tags) byTag.set(tag.toLowerCase(), kind as TagKind)

export const kindOf = (tag: string): TagKind => byTag.get(tag.toLowerCase()) ?? 'field'
