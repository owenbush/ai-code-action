import * as core from '@actions/core'
import * as github from '@actions/github'
import { resolveModel } from './resolve-model.js'
import { resolveTools } from './resolve-tools.js'
import { runAgentLoop } from './agent-loop.js'
import { writeOutput } from './output.js'

function getBooleanInputSafe(name: string): boolean {
  try {
    return core.getBooleanInput(name)
  } catch {
    throw new Error(
      `Invalid value for "${name}": "${core.getInput(name)}". Must be true or false.`,
    )
  }
}

const MAX_STEPS_CEILING = 100

async function run(): Promise<void> {
  const prompt = core.getInput('prompt', { required: true })
  const provider = core.getInput('provider') || 'anthropic'
  const apiKey = core.getInput('api-key', { required: true })
  const modelId = core.getInput('model') || undefined
  const system = core.getInput('system') || undefined
  const preset = core.getInput('preset') || 'code-review'
  const toolFlags = (core.getInput('tools') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const maxStepsRaw = parseInt(core.getInput('max-steps') || '15', 10)
  if (isNaN(maxStepsRaw) || maxStepsRaw < 1) {
    throw new Error(`Invalid max-steps: "${core.getInput('max-steps')}"`)
  }
  const maxSteps = Math.min(maxStepsRaw, MAX_STEPS_CEILING)
  if (maxStepsRaw > MAX_STEPS_CEILING) {
    core.warning(
      `max-steps capped to ${MAX_STEPS_CEILING} (was ${maxStepsRaw})`,
    )
  }
  const comment = getBooleanInputSafe('comment')
  const schema = core.getInput('schema') || undefined
  const githubToken = core.getInput('github-token')
  const allowGithubWrites = getBooleanInputSafe('allow-github-writes')
  const allowShellOnPr = getBooleanInputSafe('allow-shell-on-pr')

  const isPREvent = !!github.context.payload.pull_request

  if (!githubToken && (comment || isPREvent)) {
    throw new Error(
      'github-token is required when comment is enabled or running on a pull_request event',
    )
  }

  if (toolFlags.includes('shell') && isPREvent && !allowShellOnPr) {
    throw new Error(
      'Shell tool is disabled on pull_request events by default because PR content ' +
        '(title, body, diff) is attacker-controlled on public repos and is injected into ' +
        'the system prompt. Set allow-shell-on-pr: true to override if you understand the risk.',
    )
  }

  core.info(`Provider: ${provider}`)
  core.info(`Model: ${modelId || '(default)'}`)
  core.info(`Preset: ${preset}`)
  core.info(`Max steps: ${maxSteps}`)
  core.info(`Tools: ${toolFlags.length ? toolFlags.join(', ') : '(github only)'}`)
  core.info(`GitHub writes: ${allowGithubWrites ? 'enabled' : 'disabled'}`)
  if (schema) core.info('Structured output: enabled')

  const model = resolveModel(provider, modelId, apiKey)
  const tools = resolveTools(githubToken, preset, toolFlags, allowGithubWrites)

  const result = await runAgentLoop({
    model,
    tools,
    system,
    prompt,
    maxSteps,
    schema,
    githubToken,
  })

  core.info(
    `Completed in ${result.steps} steps with ${result.toolCalls.length} tool calls`,
  )

  await writeOutput({
    text: result.text,
    json: result.json,
    comment,
    githubToken,
  })
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
