import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

describe('safePathLexical', () => {
  const FAKE_WORKSPACE = '/home/runner/work/repo/repo'
  let safePathLexical: (relative: string) => string

  beforeEach(async () => {
    vi.stubEnv('GITHUB_WORKSPACE', FAKE_WORKSPACE)
    const mod = await import('../tools/workspace.js')
    safePathLexical = mod.safePathLexical
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('resolves a simple relative path', () => {
    const result = safePathLexical('src/main.ts')
    expect(result).toBe(path.join(FAKE_WORKSPACE, 'src/main.ts'))
  })

  it('resolves a nested path', () => {
    const result = safePathLexical('src/tools/workspace.ts')
    expect(result).toBe(path.join(FAKE_WORKSPACE, 'src/tools/workspace.ts'))
  })

  it('blocks directory traversal with ../', () => {
    expect(() => safePathLexical('../../../etc/passwd')).toThrow('escapes the workspace')
  })

  it('blocks traversal hidden in a nested path', () => {
    expect(() => safePathLexical('src/../../..')).toThrow('escapes the workspace')
  })

  it('blocks absolute paths outside workspace', () => {
    expect(() => safePathLexical('/etc/passwd')).toThrow('escapes the workspace')
  })

  it('allows the workspace root itself', () => {
    const result = safePathLexical('.')
    expect(result).toBe(FAKE_WORKSPACE)
  })

  it('blocks a path that is a prefix of the workspace but not inside it', () => {
    expect(() => safePathLexical('../repo-evil/payload')).toThrow('escapes the workspace')
  })

  it('normalizes double slashes and dots', () => {
    const result = safePathLexical('src/./tools/../tools/workspace.ts')
    expect(result).toBe(path.join(FAKE_WORKSPACE, 'src/tools/workspace.ts'))
  })
})

describe('safePath (async, symlink resolution)', () => {
  let testDir: string
  let safePath: (relative: string) => Promise<string>

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'safepath-test-'))
    vi.stubEnv('GITHUB_WORKSPACE', testDir)
    vi.resetModules()
    const mod = await import('../tools/workspace.js')
    safePath = mod.safePath
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.resetModules()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('allows a normal file inside workspace', async () => {
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true })
    await fs.writeFile(path.join(testDir, 'src/file.ts'), 'content')
    const result = await safePath('src/file.ts')
    expect(result).toBe(path.join(testDir, 'src/file.ts'))
  })

  it('blocks symlink pointing outside workspace', async () => {
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'outside-'))
    try {
      await fs.symlink(outsideDir, path.join(testDir, 'escape-link'))
      await expect(safePath('escape-link/evil.txt')).rejects.toThrow('escapes the workspace via symlink')
    } finally {
      await fs.rm(outsideDir, { recursive: true, force: true })
    }
  })

  it('allows symlink pointing inside workspace', async () => {
    await fs.mkdir(path.join(testDir, 'real-dir'), { recursive: true })
    await fs.writeFile(path.join(testDir, 'real-dir/file.ts'), 'content')
    await fs.symlink(path.join(testDir, 'real-dir'), path.join(testDir, 'internal-link'))
    const result = await safePath('internal-link/file.ts')
    expect(result).toBe(path.join(testDir, 'internal-link/file.ts'))
  })

  it('allows path to non-existent file in existing directory', async () => {
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true })
    const result = await safePath('src/new-file.ts')
    expect(result).toBe(path.join(testDir, 'src/new-file.ts'))
  })

  it('allows path to non-existent nested directory', async () => {
    const result = await safePath('new/deep/path/file.ts')
    expect(result).toBe(path.join(testDir, 'new/deep/path/file.ts'))
  })
})
