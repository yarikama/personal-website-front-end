import { describe, expect, it } from 'vitest'
import { kindOf } from './tagKinds'

describe('kindOf, the colour of a featured card tag', () => {
  it('sorts the featured projects’ tags into their kinds', () => {
    expect(['Kubernetes', 'k3s', 'Argo CD', 'CloudNativePG', 'Slurm'].map(kindOf)).toEqual(Array(5).fill('infra'))
    expect(['PyTorch', 'vLLM', 'LLaVA', 'Llama 3.1'].map(kindOf)).toEqual(Array(4).fill('model'))
    expect(['GRPO', 'PPO', 'Activation Steering', 'Knowledge Distillation'].map(kindOf)).toEqual(Array(4).fill('method'))
  })

  it('reads a tag the same whatever its case', () => {
    expect(kindOf('K3S')).toBe('infra')
    expect(kindOf('pytorch')).toBe('model')
  })

  it('takes a tag it does not know for a field', () => {
    expect(kindOf('Multimodal LLM')).toBe('field')
    expect(kindOf('LLM Security')).toBe('field')
    expect(kindOf('')).toBe('field')
  })
})
