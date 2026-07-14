import { tool } from 'ai'
import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import { safePath, workspace } from './workspace.js'

async function listRecursive(
  dir: string,
  maxDepth: number,
  depth = 0,
): Promise<string[]> {
  if (depth >= maxDepth) return []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    const rel = path.relative(workspace, full)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      results.push(rel + '/')
      results.push(...(await listRecursive(full, maxDepth, depth + 1)))
    } else {
      results.push(rel)
    }
  }

  return results
}

export const listDirectory = tool({
  description:
    'List files and directories in the repository. Skips .git and node_modules.',
  inputSchema: z.object({
    path: z
      .string()
      .default('.')
      .describe('Relative directory path from the repo root'),
    depth: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(2)
      .describe('Maximum directory depth to recurse (1-5)'),
  }),
  execute: async ({ path: dirPath, depth }) => {
    const resolved = await safePath(dirPath)
    const files = await listRecursive(resolved, depth)
    return files.join('\n')
  },
})
