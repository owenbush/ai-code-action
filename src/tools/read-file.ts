import { tool } from 'ai'
import { z } from 'zod'
import fs from 'node:fs/promises'
import { safePath } from './workspace.js'

export const readFile = tool({
  description:
    'Read the contents of a file in the repository. Returns the full text content.',
  inputSchema: z.object({
    path: z.string().describe('Relative path to the file from the repo root'),
  }),
  execute: async ({ path: filePath }) => {
    const resolved = safePath(filePath)
    const content = await fs.readFile(resolved, 'utf-8')
    return content
  },
})
