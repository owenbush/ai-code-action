import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GITHUB_WRITE_TOOLS } from '@github-tools/sdk'

// Mock @actions/core to capture warnings
vi.mock('@actions/core', () => ({
  warning: vi.fn(),
  info: vi.fn(),
  getInput: vi.fn(() => ''),
  getBooleanInput: vi.fn(() => false),
}))

import * as core from '@actions/core'
import { resolveTools } from '../resolve-tools.js'

const TOKEN = 'ghp_test_token'

describe('resolveTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws on an invalid preset', () => {
    expect(() => resolveTools(TOKEN, 'invalid-preset', [], false)).toThrow(
      'Invalid preset "invalid-preset"',
    )
  })

  it('warns on unknown tool flags', () => {
    resolveTools(TOKEN, 'code-review', ['banana'], false)
    expect(core.warning).toHaveBeenCalledWith('Unknown tool flag: "banana"')
  })

  it('returns github tools for a valid preset with no flags', () => {
    const tools = resolveTools(TOKEN, 'code-review', [], false)
    expect(Object.keys(tools).length).toBeGreaterThan(0)
  })

  it('excludes GitHub write tools when allowGithubWrites is false', () => {
    const tools = resolveTools(TOKEN, 'maintainer', [], false)
    const writeToolNames = new Set(Object.keys(GITHUB_WRITE_TOOLS))
    for (const name of Object.keys(tools)) {
      expect(writeToolNames.has(name)).toBe(false)
    }
  })

  it('includes GitHub write tools when allowGithubWrites is true', () => {
    const tools = resolveTools(TOKEN, 'maintainer', [], true)
    const writeToolNames = Object.keys(GITHUB_WRITE_TOOLS)
    const included = writeToolNames.filter((name) => name in tools)
    expect(included.length).toBeGreaterThan(0)
  })

  it('adds local-files tools when flag is set', () => {
    const tools = resolveTools(TOKEN, 'code-review', ['local-files'], false)
    expect(tools).toHaveProperty('read_file')
    expect(tools).toHaveProperty('list_directory')
    expect(tools).toHaveProperty('search_files')
  })

  it('does not add local-files tools when flag is absent', () => {
    const tools = resolveTools(TOKEN, 'code-review', [], false)
    expect(tools).not.toHaveProperty('read_file')
    expect(tools).not.toHaveProperty('list_directory')
    expect(tools).not.toHaveProperty('search_files')
  })

  it('adds local-write tools when flag is set', () => {
    const tools = resolveTools(TOKEN, 'code-review', ['local-write'], false)
    expect(tools).toHaveProperty('write_file')
    expect(tools).toHaveProperty('create_directory')
  })

  it('does not add local-write tools when flag is absent', () => {
    const tools = resolveTools(TOKEN, 'code-review', [], false)
    expect(tools).not.toHaveProperty('write_file')
    expect(tools).not.toHaveProperty('create_directory')
  })

  it('adds git tools when flag is set', () => {
    const tools = resolveTools(TOKEN, 'code-review', ['git'], false)
    expect(tools).toHaveProperty('git_diff')
    expect(tools).toHaveProperty('git_commit_and_push')
  })

  it('does not add git tools when flag is absent', () => {
    const tools = resolveTools(TOKEN, 'code-review', [], false)
    expect(tools).not.toHaveProperty('git_diff')
    expect(tools).not.toHaveProperty('git_commit_and_push')
  })

  it('adds shell tools when flag is set', () => {
    const tools = resolveTools(TOKEN, 'code-review', ['shell'], false)
    expect(tools).toHaveProperty('run_command')
  })

  it('does not add shell tools when flag is absent', () => {
    const tools = resolveTools(TOKEN, 'code-review', [], false)
    expect(tools).not.toHaveProperty('run_command')
  })

  it('warns when git tools are enabled but allowGithubWrites is false', () => {
    resolveTools(TOKEN, 'code-review', ['git'], false)
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('git is enabled but allow-github-writes is false'),
    )
  })

  it('does not warn when git tools are enabled and allowGithubWrites is true', () => {
    resolveTools(TOKEN, 'code-review', ['git'], true)
    const calls = vi.mocked(core.warning).mock.calls
    const gitWarnings = calls.filter(([msg]) =>
      String(msg).includes('git is enabled but allow-github-writes is false'),
    )
    expect(gitWarnings).toHaveLength(0)
  })

  it('combines multiple tool flags', () => {
    const tools = resolveTools(
      TOKEN,
      'code-review',
      ['local-files', 'local-write', 'git', 'shell'],
      false,
    )
    expect(tools).toHaveProperty('read_file')
    expect(tools).toHaveProperty('write_file')
    expect(tools).toHaveProperty('git_diff')
    expect(tools).toHaveProperty('run_command')
  })
})
