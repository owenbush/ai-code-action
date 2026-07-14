import path from 'node:path'
import fs from 'node:fs/promises'

const workspace = process.env.GITHUB_WORKSPACE || process.cwd()

export function safePathLexical(relative: string): string {
  const resolved = path.resolve(workspace, relative)
  if (resolved !== workspace && !resolved.startsWith(workspace + path.sep)) {
    throw new Error(`Path "${relative}" escapes the workspace`)
  }
  return resolved
}

export async function safePath(relative: string): Promise<string> {
  const resolved = safePathLexical(relative)

  const realWorkspace = await fs.realpath(workspace)
  let existing = resolved
  while (existing !== path.dirname(existing)) {
    try {
      await fs.lstat(existing)
      break
    } catch {
      existing = path.dirname(existing)
    }
  }

  const realExisting = await fs.realpath(existing)
  if (
    realExisting !== realWorkspace &&
    !realExisting.startsWith(realWorkspace + path.sep)
  ) {
    throw new Error(`Path "${relative}" escapes the workspace via symlink`)
  }

  return resolved
}

export { workspace }
