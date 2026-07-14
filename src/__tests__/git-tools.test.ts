import { describe, it, expect } from 'vitest'
import { gitDiff } from '../tools/git.js'

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
