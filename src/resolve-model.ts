import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createGateway, type LanguageModel } from 'ai'

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4.1',
  google: 'gemini-2.5-flash',
  mistral: 'mistral-large-latest',
}

const SUPPORTED_PROVIDERS = new Set(Object.keys(DEFAULT_MODELS))

export function resolveModel(
  provider: string,
  model: string | undefined,
  apiKey: string,
): LanguageModel {
  if (provider === 'gateway') {
    if (!model) {
      throw new Error(
        'Gateway provider requires an explicit model (e.g. "anthropic/claude-sonnet-4-6")',
      )
    }
    const gw = createGateway({ apiKey })
    return gw(model)
  }

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(
      `Unknown provider "${provider}". Supported: ${[...SUPPORTED_PROVIDERS].join(', ')}, gateway`,
    )
  }

  const modelId = model || DEFAULT_MODELS[provider]

  switch (provider) {
    case 'anthropic': {
      const p = createAnthropic({ apiKey })
      return p(modelId)
    }
    case 'openai': {
      const p = createOpenAI({ apiKey })
      return p(modelId)
    }
    case 'google': {
      const p = createGoogleGenerativeAI({ apiKey })
      return p(modelId)
    }
    case 'mistral': {
      const p = createMistral({ apiKey })
      return p(modelId)
    }
    default:
      throw new Error(`Unhandled provider: ${provider}`)
  }
}
