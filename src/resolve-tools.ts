// GITHUB_WRITE_TOOLS is the security boundary for allow-github-writes.
// If @github-tools/sdk adds new write tools, this set must include them.
// Pin to the current major version and audit the changelog on upgrades.
import { createGithubTools, GITHUB_WRITE_TOOLS } from '@github-tools/sdk'
import * as core from '@actions/core'
import { readFile } from './tools/read-file.js'
import { listDirectory } from './tools/list-directory.js'
import { searchFiles } from './tools/search-files.js'
import { writeFile, createDirectory } from './tools/write-file.js'
import { gitDiff, gitCommitAndPush } from './tools/git.js'
import { runCommand } from './tools/run-command.js'

type Preset =
  | 'code-review'
  | 'issue-triage'
  | 'repo-explorer'
  | 'ci-ops'
  | 'maintainer'

const VALID_PRESETS = new Set<string>([
  'code-review',
  'issue-triage',
  'repo-explorer',
  'ci-ops',
  'maintainer',
])

const LOCAL_READ_TOOLS = {
  read_file: readFile,
  list_directory: listDirectory,
  search_files: searchFiles,
} as const

const LOCAL_WRITE_TOOLS = {
  write_file: writeFile,
  create_directory: createDirectory,
} as const

const GIT_TOOLS = {
  git_diff: gitDiff,
  git_commit_and_push: gitCommitAndPush,
} as const

const SHELL_TOOLS = {
  run_command: runCommand,
} as const

const VALID_FLAGS = new Set([
  'local-files',
  'local-write',
  'git',
  'shell',
])

const WRITE_TOOL_NAMES = new Set(Object.keys(GITHUB_WRITE_TOOLS))

export function resolveTools(
  token: string,
  preset: string,
  toolFlags: string[],
  allowGithubWrites: boolean,
) {
  if (!VALID_PRESETS.has(preset)) {
    throw new Error(
      `Invalid preset "${preset}". Valid presets: ${[...VALID_PRESETS].join(', ')}`,
    )
  }

  for (const flag of toolFlags) {
    if (!VALID_FLAGS.has(flag)) {
      core.warning(`Unknown tool flag: "${flag}"`)
    }
  }

  const githubTools = createGithubTools({
    token,
    preset: preset as Preset,
  })

  let tools: Record<string, any> = {}
  for (const [name, t] of Object.entries(githubTools)) {
    if (!allowGithubWrites && WRITE_TOOL_NAMES.has(name)) continue
    tools[name] = t
  }

  if (toolFlags.includes('local-files')) {
    tools = { ...tools, ...LOCAL_READ_TOOLS }
  }

  if (toolFlags.includes('local-write')) {
    tools = { ...tools, ...LOCAL_WRITE_TOOLS }
  }

  if (toolFlags.includes('git')) {
    if (!allowGithubWrites) {
      core.warning(
        'tools: git is enabled but allow-github-writes is false. The git tools can push ' +
          'commits directly, bypassing the GitHub API write guard. If you intended to block ' +
          'all repo mutation, remove "git" from the tools list.',
      )
    }
    tools = { ...tools, ...GIT_TOOLS }
  }

  if (toolFlags.includes('shell')) {
    tools = { ...tools, ...SHELL_TOOLS }
  }

  return tools
}
