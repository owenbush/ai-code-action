import { tool } from 'ai'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile as readFileFs } from 'node:fs/promises'
import { safePath, workspace } from './workspace.js'

const execFileAsync = promisify(execFile)

async function git(
  ...args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('git', args, {
    cwd: workspace,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
}

export async function isForkPR(): Promise<boolean> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) return false
  try {
    const raw = await readFileFs(eventPath, 'utf-8')
    const event = JSON.parse(raw)
    const head = event.pull_request?.head?.repo?.full_name
    const base = event.pull_request?.base?.repo?.full_name
    return !!(head && base && head !== base)
  } catch {
    return false
  }
}

export const gitDiff = tool({
  description:
    'Show the git diff for the current working tree or between refs. Useful for seeing what files have changed and what the changes are.',
  inputSchema: z.object({
    ref: z
      .string()
      .optional()
      .describe(
        'Git ref to diff against (e.g. "HEAD", "main", "HEAD~1"). Omit for unstaged changes.',
      ),
    nameOnly: z
      .boolean()
      .default(false)
      .describe('If true, only list changed file names (no content diff)'),
    path: z
      .string()
      .optional()
      .describe('Restrict diff to a specific file or directory'),
  }),
  execute: async ({ ref, nameOnly, path: diffPath }) => {
    if (ref && ref.startsWith('-')) {
      return 'Invalid ref: must not start with "-"'
    }
    if (diffPath) {
      await safePath(diffPath)
    }
    const args = ['diff']
    if (nameOnly) args.push('--name-only')
    if (ref) args.push(ref)
    if (diffPath) {
      args.push('--', diffPath)
    }

    const { stdout } = await git(...args)
    return stdout || 'No changes.'
  },
})

export const gitCommitAndPush = tool({
  description:
    'Stage files, create a git commit, and push to the current branch. Use this to save changes back to the repository.',
  inputSchema: z.object({
    files: z
      .array(z.string())
      .describe(
        'Relative file paths to stage (e.g. [".decodie/entry-1.json"]). Use ["."] to stage all changes.',
      ),
    message: z.string().describe('Commit message'),
  }),
  execute: async ({ files, message }) => {
    for (const f of files) {
      if (f !== '.') await safePath(f)
    }

    await git('add', '--', ...files)

    const { stdout: staged } = await git('diff', '--cached', '--name-only')
    if (!staged.trim()) {
      return 'Nothing to commit — no staged changes.'
    }

    await git(
      '-c', 'user.name=ai-code-action',
      '-c', 'user.email=ai-code-action@users.noreply.github.com',
      'commit', '-m', message,
    )

    if (await isForkPR()) {
      return 'Committed locally but cannot push — this is a fork PR and origin points to the base repo, not the fork.'
    }

    let branch = (
      await git('rev-parse', '--abbrev-ref', 'HEAD')
    ).stdout.trim()
    if (branch === 'HEAD') {
      branch = process.env.GITHUB_HEAD_REF || ''
    }
    if (!branch) {
      return 'Committed locally but cannot push — detached HEAD and GITHUB_HEAD_REF is not set. Check out a branch first.'
    }
    await git('push', 'origin', `HEAD:refs/heads/${branch}`)

    return `Committed and pushed to ${branch}: ${message}`
  },
})
