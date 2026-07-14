import { tool } from 'ai'
import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import { safePath } from './workspace.js'

export const writeFile = tool({
  description:
    'Write content to a file in the repository. Creates the file if it does not exist, overwrites if it does. Parent directories are created automatically.',
  inputSchema: z.object({
    path: z.string().describe('Relative path to the file from the repo root'),
    content: z.string().describe('The full content to write to the file'),
  }),
  execute: async ({ path: filePath, content }) => {
    const resolved = safePath(filePath)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, content, 'utf-8')
    return `Wrote ${Buffer.byteLength(content, 'utf-8')} bytes to ${filePath}`
  },
})

export const createDirectory = tool({
  description:
    'Create a directory in the repository. Creates parent directories automatically if needed.',
  inputSchema: z.object({
    path: z
      .string()
      .describe('Relative directory path from the repo root'),
  }),
  execute: async ({ path: dirPath }) => {
    const resolved = safePath(dirPath)
    await fs.mkdir(resolved, { recursive: true })
    return `Created directory ${dirPath}`
  },
})
