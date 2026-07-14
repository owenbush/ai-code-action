import { tool } from 'ai'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { workspace } from './workspace.js'

const execFileAsync = promisify(execFile)

export const searchFiles = tool({
  description:
    'Search for a pattern across files in the repository using grep. Returns matching lines with file paths and line numbers.',
  inputSchema: z.object({
    pattern: z.string().describe('Search pattern (basic regex)'),
    glob: z
      .string()
      .optional()
      .describe('File glob to restrict search (e.g. "*.ts", "src/**/*.js")'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe('Maximum number of matching lines to return'),
  }),
  execute: async ({ pattern, glob, maxResults }) => {
    const args = [
      '-rn',
      '--exclude-dir=.git',
      '--exclude-dir=node_modules',
    ]

    if (glob) {
      args.push(`--include=${glob}`)
    }

    args.push('--', pattern, '.')

    try {
      const { stdout } = await execFileAsync('grep', args, {
        cwd: workspace,
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      })
      const truncated = stdout.split('\n').slice(0, maxResults).join('\n')
      return truncated || 'No matches found.'
    } catch (err: any) {
      if (err.code === 1) return 'No matches found.'
      throw err
    }
  },
})
