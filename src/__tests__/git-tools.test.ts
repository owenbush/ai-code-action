import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import { gitDiff, isForkPR } from '../tools/git.js'

describe('gitDiff', () => {
  it('rejects refs starting with -', async () => {
    const result = await gitDiff.execute(
      { ref: '-G<regex>', nameOnly: false },
      { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal },
    )
    expect(result).toBe('Invalid ref: must not start with "-"')
  })

  it('rejects --output style refs', async () => {
    const result = await gitDiff.execute(
      { ref: '--output=/tmp/evil', nameOnly: false },
      { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal },
    )
    expect(result).toBe('Invalid ref: must not start with "-"')
  })
})

describe('isForkPR', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fork-pr-test-'))
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('returns true when head and base repos differ', async () => {
    const eventFile = path.join(tempDir, 'event.json')
    await fs.writeFile(eventFile, JSON.stringify({
      pull_request: {
        head: { repo: { full_name: 'attacker/repo' } },
        base: { repo: { full_name: 'owner/repo' } },
      },
    }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventFile)
    expect(await isForkPR()).toBe(true)
  })

  it('returns false when head and base repos match', async () => {
    const eventFile = path.join(tempDir, 'event.json')
    await fs.writeFile(eventFile, JSON.stringify({
      pull_request: {
        head: { repo: { full_name: 'owner/repo' } },
        base: { repo: { full_name: 'owner/repo' } },
      },
    }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventFile)
    expect(await isForkPR()).toBe(false)
  })

  it('returns false when GITHUB_EVENT_PATH is not set', async () => {
    vi.stubEnv('GITHUB_EVENT_PATH', '')
    expect(await isForkPR()).toBe(false)
  })

  it('returns false when event has no pull_request', async () => {
    const eventFile = path.join(tempDir, 'event.json')
    await fs.writeFile(eventFile, JSON.stringify({ issue: { number: 1 } }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventFile)
    expect(await isForkPR()).toBe(false)
  })

  it('returns false when event file does not exist', async () => {
    vi.stubEnv('GITHUB_EVENT_PATH', path.join(tempDir, 'nonexistent.json'))
    expect(await isForkPR()).toBe(false)
  })
})
