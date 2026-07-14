import path from 'node:path'

const workspace = process.env.GITHUB_WORKSPACE || process.cwd()

export function safePath(relative: string): string {
  const resolved = path.resolve(workspace, relative)
  if (resolved !== workspace && !resolved.startsWith(workspace + path.sep)) {
    throw new Error(`Path "${relative}" escapes the workspace`)
  }
  return resolved
}

export { workspace }
