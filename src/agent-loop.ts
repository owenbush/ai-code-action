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

const DIFF_NOISE_PATTERNS = [
  /^diff --git a\/dist\//,
  /^diff --git a\/.*\.map$/,
  /^diff --git a\/package-lock\.json/,
  /^diff --git a\/.*\.d\.ts$/,
]

function isNoiseFile(diffHeader: string): boolean {
  return DIFF_NOISE_PATTERNS.some((p) => p.test(diffHeader))
}

function filterDiff(raw: string, maxLength: number): string {
  const files = raw.split(/(?=^diff --git )/m)
  const filtered: string[] = []
  let length = 0

  for (const file of files) {
    const firstLine = file.slice(0, file.indexOf('\n'))
    if (isNoiseFile(firstLine)) continue
    if (length + file.length > maxLength) {
      const remaining = maxLength - length
      if (remaining > 200) {
        let chunk = file.slice(0, remaining)
        const lastNewline = chunk.lastIndexOf('\n')
        if (lastNewline > 0) chunk = chunk.slice(0, lastNewline)
        filtered.push(chunk)
      }
      break
    }
    filtered.push(file)
    length += file.length
  }

  return filtered.join('')
}

async function fetchPRContext(githubToken: string): Promise<string | null> {
  const pr = github.context.payload.pull_request
  if (!pr) return null

  try {
    const octokit = github.getOctokit(githubToken)
    const { owner, repo } = github.context.repo

    const allFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })

    const diffRes = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pr.number,
      mediaType: { format: 'diff' },
    })

    const changedFiles = allFiles
      .map((f) => `  ${f.status.charAt(0).toUpperCase()} ${f.filename} (+${f.additions} -${f.deletions})`)
      .join('\n')

    const diff = filterDiff(String(diffRes.data), 30_000)

    return [
      `\n## Changed Files (${allFiles.length})`,
      changedFiles,
      '',
      '## Diff (filtered, truncated to 30k chars)',
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
