import {
  generateText,
  isStepCount,
  jsonSchema,
  Output,
  type LanguageModel,
} from 'ai'
import * as core from '@actions/core'
import * as github from '@actions/github'

export interface AgentLoopOptions {
  model: LanguageModel
  tools: Record<string, any>
  system?: string
  prompt: string
  maxSteps: number
  schema?: string
  githubToken: string
}

export interface AgentLoopResult {
  text: string
  json?: string
  steps: number
  toolCalls: any[]
}

async function fetchPRContext(githubToken: string): Promise<string | null> {
  const pr = github.context.payload.pull_request
  if (!pr) return null

  try {
    const octokit = github.getOctokit(githubToken)
    const { owner, repo } = github.context.repo

    const [filesRes, diffRes] = await Promise.all([
      octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
        per_page: 100,
      }),
      octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pr.number,
        mediaType: { format: 'diff' },
      }),
    ])

    const changedFiles = filesRes.data
      .map((f) => `  ${f.status.charAt(0).toUpperCase()} ${f.filename} (+${f.additions} -${f.deletions})`)
      .join('\n')

    const rawDiff = String(diffRes.data)
    let diff = rawDiff.slice(0, 30_000)
    if (diff.length < rawDiff.length) {
      const lastNewline = diff.lastIndexOf('\n')
      if (lastNewline > 0) diff = diff.slice(0, lastNewline)
    }

    return [
      `\n## Changed Files (${filesRes.data.length})`,
      changedFiles,
      '',
      '## Diff (truncated to 30k chars)',
      '```diff',
      diff,
      '```',
    ].join('\n')
  } catch (err) {
    core.warning(`Failed to fetch PR context: ${err}`)
    return null
  }
}

function buildDefaultSystem(prContext: string | null): string {
  const { owner, repo } = github.context.repo
  const event = github.context.eventName
  const pr = github.context.payload.pull_request

  const lines = [
    'You are an AI assistant running as a GitHub Action.',
    'You have access to GitHub API tools and may also have local file tools.',
    'Use your tools to gather context before forming conclusions.',
    'Be specific — reference file paths, line numbers, and code when relevant.',
    'Keep your response focused and actionable.',
    '',
    `Repository: ${owner}/${repo}`,
    `Event: ${event}`,
  ]

  if (pr) {
    lines.push(`Pull Request: #${pr.number} — ${pr.title}`)
    lines.push(`Branch: ${pr.head.ref} → ${pr.base.ref}`)
    if (pr.body) {
      lines.push('', '## PR Description', pr.body.slice(0, 2000))
    }
  }

  if (prContext) {
    lines.push(prContext)
  }

  return lines.join('\n')
}

function parseSchema(raw: string): object {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(
      `Invalid JSON in "schema" input: ${raw.slice(0, 100)}...`,
    )
  }
}

export async function runAgentLoop(
  options: AgentLoopOptions,
): Promise<AgentLoopResult> {
  const prContext = await fetchPRContext(options.githubToken)
  const system = options.system || buildDefaultSystem(prContext)

  if (options.schema) {
    const parsed = parseSchema(options.schema)
    const result = await generateText({
      model: options.model,
      tools: options.tools,
      stopWhen: isStepCount(options.maxSteps),
      system,
      prompt: options.prompt,
      output: Output.object({ schema: jsonSchema(parsed) }),
    })

    return {
      text: result.text,
      json: JSON.stringify(result.output),
      steps: result.steps.length,
      toolCalls: result.steps.flatMap((s) => s.toolCalls),
    }
  }

  const result = await generateText({
    model: options.model,
    tools: options.tools,
    stopWhen: isStepCount(options.maxSteps),
    system,
    prompt: options.prompt,
  })

  return {
    text: result.text,
    steps: result.steps.length,
    toolCalls: result.steps.flatMap((s) => s.toolCalls),
  }
}
