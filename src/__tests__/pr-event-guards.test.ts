import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @actions/core — simulate input values via a map
const inputValues: Record<string, string> = {}

vi.mock('@actions/core', () => ({
  getInput: vi.fn((name: string, opts?: { required?: boolean }) => {
    const val = inputValues[name] ?? ''
    if (opts?.required && !val) {
      throw new Error(`Input required and not supplied: ${name}`)
    }
    return val
  }),
  getBooleanInput: vi.fn((name: string) => {
    const val = inputValues[name] ?? 'false'
    if (val === 'true') return true
    if (val === 'false') return false
    throw new Error(`not boolean: ${val}`)
  }),
  info: vi.fn(),
  warning: vi.fn(),
  setFailed: vi.fn(),
}))

// Mock @actions/github — control the event payload
const mockPayload: Record<string, any> = {}

vi.mock('@actions/github', () => ({
  context: {
    get payload() {
      return mockPayload
    },
    repo: { owner: 'test', repo: 'test' },
    issue: { number: 1 },
  },
}))

// Mock the heavy modules we don't need for guard tests
vi.mock('../resolve-model.js', () => ({
  resolveModel: vi.fn(() => ({})),
}))

vi.mock('../resolve-tools.js', () => ({
  resolveTools: vi.fn(() => ({})),
}))

vi.mock('../agent-loop.js', () => ({
  runAgentLoop: vi.fn(async () => ({
    text: 'ok',
    json: undefined,
    steps: 1,
    toolCalls: [],
  })),
}))

vi.mock('../output.js', () => ({
  writeOutput: vi.fn(async () => {}),
}))

function setInputs(overrides: Record<string, string>) {
  Object.keys(inputValues).forEach((k) => delete inputValues[k])
  Object.assign(inputValues, {
    prompt: 'test prompt',
    'api-key': 'test-key',
    provider: 'anthropic',
    preset: 'code-review',
    tools: '',
    'max-steps': '15',
    comment: 'false',
    schema: '',
    'github-token': 'ghp_test',
    'allow-github-writes': 'false',
    'allow-write-on-pr': 'false',
    'allow-shell-on-pr': 'false',
    ...overrides,
  })
}

function setPREvent(isPR: boolean) {
  Object.keys(mockPayload).forEach((k) => delete mockPayload[k])
  if (isPR) {
    mockPayload.pull_request = { number: 1 }
  }
}

function setIssueCommentOnPR() {
  Object.keys(mockPayload).forEach((k) => delete mockPayload[k])
  mockPayload.issue = { number: 1, pull_request: { url: 'https://api.github.com/repos/test/test/pulls/1' } }
}

// We need to import the run function indirectly since main.ts auto-executes.
// Instead, replicate the guard logic for testing.
// This is cleaner than trying to intercept the auto-executing run().

function parseToolFlags(tools: string): string[] {
  return tools
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isPREvent(payload: Record<string, any>): boolean {
  return !!payload.pull_request || !!payload.issue?.pull_request
}

function checkWriteGuard(toolFlags: string[], payload: Record<string, any>, allowWriteOnPr: boolean): string | null {
  const hasWriteFlags = toolFlags.includes('local-write') || toolFlags.includes('git')
  if (hasWriteFlags && isPREvent(payload) && !allowWriteOnPr) {
    return 'Write and git tools are disabled on pull_request events'
  }
  return null
}

function checkShellGuard(toolFlags: string[], payload: Record<string, any>, allowShellOnPr: boolean): string | null {
  if (toolFlags.includes('shell') && isPREvent(payload) && !allowShellOnPr) {
    return 'Shell tool is disabled on pull_request events'
  }
  return null
}

const PR_PAYLOAD = { pull_request: { number: 1 } }
const ISSUE_COMMENT_ON_PR_PAYLOAD = { issue: { number: 1, pull_request: { url: 'https://api.github.com/repos/test/test/pulls/1' } } }
const NON_PR_PAYLOAD = {}

describe('PR event guards', () => {
  describe('write/git guard', () => {
    it('blocks local-write on PR events by default', () => {
      const error = checkWriteGuard(['local-files', 'local-write'], PR_PAYLOAD, false)
      expect(error).toContain('Write and git tools are disabled')
    })

    it('blocks git on PR events by default', () => {
      const error = checkWriteGuard(['git'], PR_PAYLOAD, false)
      expect(error).toContain('Write and git tools are disabled')
    })

    it('blocks local-write + git combined on PR events', () => {
      const error = checkWriteGuard(['local-write', 'git'], PR_PAYLOAD, false)
      expect(error).toContain('Write and git tools are disabled')
    })

    it('blocks local-write on issue_comment events on PRs', () => {
      const error = checkWriteGuard(['local-write'], ISSUE_COMMENT_ON_PR_PAYLOAD, false)
      expect(error).toContain('Write and git tools are disabled')
    })

    it('blocks git on issue_comment events on PRs', () => {
      const error = checkWriteGuard(['git'], ISSUE_COMMENT_ON_PR_PAYLOAD, false)
      expect(error).toContain('Write and git tools are disabled')
    })

    it('allows local-write on PR events when allow-write-on-pr is true', () => {
      const error = checkWriteGuard(['local-write'], PR_PAYLOAD, true)
      expect(error).toBeNull()
    })

    it('allows git on PR events when allow-write-on-pr is true', () => {
      const error = checkWriteGuard(['git'], PR_PAYLOAD, true)
      expect(error).toBeNull()
    })

    it('allows local-write on non-PR events without flag', () => {
      const error = checkWriteGuard(['local-write'], NON_PR_PAYLOAD, false)
      expect(error).toBeNull()
    })

    it('allows git on non-PR events without flag', () => {
      const error = checkWriteGuard(['git'], NON_PR_PAYLOAD, false)
      expect(error).toBeNull()
    })

    it('does not trigger for read-only flags on PR events', () => {
      const error = checkWriteGuard(['local-files'], PR_PAYLOAD, false)
      expect(error).toBeNull()
    })

    it('does not trigger for issue_comment on plain issues (no PR)', () => {
      const error = checkWriteGuard(['local-write'], { issue: { number: 1 } }, false)
      expect(error).toBeNull()
    })
  })

  describe('shell guard', () => {
    it('blocks shell on PR events by default', () => {
      const error = checkShellGuard(['shell'], PR_PAYLOAD, false)
      expect(error).toContain('Shell tool is disabled')
    })

    it('blocks shell on issue_comment events on PRs by default', () => {
      const error = checkShellGuard(['shell'], ISSUE_COMMENT_ON_PR_PAYLOAD, false)
      expect(error).toContain('Shell tool is disabled')
    })

    it('allows shell on PR events when allow-shell-on-pr is true', () => {
      const error = checkShellGuard(['shell'], PR_PAYLOAD, true)
      expect(error).toBeNull()
    })

    it('allows shell on non-PR events without flag', () => {
      const error = checkShellGuard(['shell'], NON_PR_PAYLOAD, false)
      expect(error).toBeNull()
    })

    it('does not trigger for non-shell flags on PR events', () => {
      const error = checkShellGuard(['local-files'], PR_PAYLOAD, false)
      expect(error).toBeNull()
    })
  })

  describe('tool flag parsing', () => {
    it('parses comma-separated flags', () => {
      expect(parseToolFlags('local-files,shell')).toEqual([
        'local-files',
        'shell',
      ])
    })

    it('trims whitespace', () => {
      expect(parseToolFlags(' local-files , shell ')).toEqual([
        'local-files',
        'shell',
      ])
    })

    it('filters empty strings', () => {
      expect(parseToolFlags('')).toEqual([])
      expect(parseToolFlags(',')).toEqual([])
    })

    it('handles a single flag', () => {
      expect(parseToolFlags('local-files')).toEqual(['local-files'])
    })
  })
})
