import { tool } from 'ai'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { workspace } from './workspace.js'

const execFileAsync = promisify(execFile)

const TIMEOUT_MS = 60_000

export const runCommand = tool({
  description:
    'Execute a shell command in the repository workspace. Use for running tests, linters, build scripts, etc. Commands time out after 60 seconds. WARNING: This tool has full shell access — do not use with untrusted prompts.',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
  }),
  execute: async ({ command }) => {
    try {
      const { stdout, stderr } = await execFileAsync(
        'bash',
        ['-c', command],
        {
          cwd: workspace,
          timeout: TIMEOUT_MS,
          maxBuffer: 1024 * 1024,
        },
      )

      const output = [
        'Exit code: 0',
        stdout ? `\nStdout:\n${stdout.slice(0, 10_000)}` : '',
        stderr ? `\nStderr:\n${stderr.slice(0, 5_000)}` : '',
      ].join('')

      return output
    } catch (err: any) {
      const exitCode = err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
        ? 'buffer exceeded'
        : err.killed
          ? 'timed out'
          : err.code ?? 'unknown'
      const stderr = err.stderr?.slice(0, 5_000) ?? ''
      const stdout = err.stdout?.slice(0, 10_000) ?? ''
      return `Exit code: ${exitCode}\n${stdout ? `Stdout:\n${stdout}\n` : ''}${stderr ? `Stderr:\n${stderr}` : ''}`
    }
  },
})
