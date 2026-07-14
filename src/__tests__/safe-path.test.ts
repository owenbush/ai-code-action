import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'node:path'

describe('safePath', () => {
  const FAKE_WORKSPACE = '/home/runner/work/repo/repo'
  let safePath: (relative: string) => string

  beforeEach(async () => {
    vi.stubEnv('GITHUB_WORKSPACE', FAKE_WORKSPACE)
    // Re-import to pick up the stubbed env
    const mod = await import('../tools/workspace.js')
    safePath = mod.safePath
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('resolves a simple relative path', () => {
    const result = safePath('src/main.ts')
    expect(result).toBe(path.join(FAKE_WORKSPACE, 'src/main.ts'))
  })

  it('resolves a nested path', () => {
    const result = safePath('src/tools/workspace.ts')
    expect(result).toBe(path.join(FAKE_WORKSPACE, 'src/tools/workspace.ts'))
  })

  it('blocks directory traversal with ../', () => {
    expect(() => safePath('../../../etc/passwd')).toThrow('escapes the workspace')
  })

  it('blocks traversal hidden in a nested path', () => {
    expect(() => safePath('src/../../..')).toThrow('escapes the workspace')
  })

  it('blocks absolute paths outside workspace', () => {
    expect(() => safePath('/etc/passwd')).toThrow('escapes the workspace')
  })

  it('allows the workspace root itself', () => {
    const result = safePath('.')
    expect(result).toBe(FAKE_WORKSPACE)
  })

  it('blocks a path that is a prefix of the workspace but not inside it', () => {
    // e.g. workspace is /home/runner/work/repo/repo
    // a path resolving to /home/runner/work/repo/repo-evil should fail
    expect(() => safePath('../repo-evil/payload')).toThrow('escapes the workspace')
  })

  it('normalizes double slashes and dots', () => {
    const result = safePath('src/./tools/../tools/workspace.ts')
    expect(result).toBe(path.join(FAKE_WORKSPACE, 'src/tools/workspace.ts'))
  })
})
