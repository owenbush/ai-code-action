import { describe, it, expect } from 'vitest'
import { resolveModel } from '../resolve-model.js'

describe('resolveModel', () => {
  it('throws for an unknown provider', () => {
    expect(() => resolveModel('cohere', undefined, 'key')).toThrow(
      'Unknown provider "cohere"',
    )
  })

  it('throws when gateway is used without a model', () => {
    expect(() => resolveModel('gateway', undefined, 'key')).toThrow(
      'Gateway provider requires an explicit model',
    )
  })

  it('returns a LanguageModel for each supported provider', () => {
    for (const provider of ['anthropic', 'openai', 'google', 'mistral']) {
      const model = resolveModel(provider, undefined, 'test-key')
      expect(model).toBeDefined()
      expect(model.modelId).toBeTruthy()
    }
  })

  it('uses the provided model ID instead of the default', () => {
    const model = resolveModel('anthropic', 'claude-opus-4-6', 'test-key')
    expect(model.modelId).toBe('claude-opus-4-6')
  })

  it('uses default model when none is specified', () => {
    const model = resolveModel('anthropic', undefined, 'test-key')
    expect(model.modelId).toBe('claude-sonnet-4-6')
  })
})
