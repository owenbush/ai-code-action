# ai-code-action

A generic, multi-provider GitHub Action that gives any LLM agentic tool use over your repository — read files, explore code, analyze PRs, and post comments. Provider-agnostic via the Vercel AI SDK.

## The Gap

- **claude-code-action** — agentic tool use, but Anthropic-only
- **vercel/ai-action** — 40+ providers via AI Gateway, but single-shot (no tool use)
- **@github-tools/sdk** — 42 GitHub tools as AI SDK tool definitions with an agent loop, but not packaged as an action
- **PR-Agent, CodeRabbit, etc.** — popular but single-shot prompting, no iterative tool use

Nobody has assembled these into a single open-source, multi-provider agentic GitHub Action.

## Architecture

```
action.yml (inputs: provider, api-key, model, prompt, tools, max-steps)
    │
    ▼
src/main.ts
    ├── resolve-model.ts    — maps provider + model to AI SDK model instance
    ├── resolve-tools.ts    — assembles tool set from presets + custom tools
    ├── agent-loop.ts       — runs generateText with tools and maxSteps
    └── output.ts           — posts PR comment and/or sets action outputs
```

### Key Design Decisions

**Provider resolution — support both gateway and direct keys:**
- If `provider: gateway` (or model string contains `/`), use Vercel AI Gateway via `ai` package
- Otherwise, dynamically import the provider package (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, etc.) and create the model directly
- This means users can use a raw `ANTHROPIC_API_KEY` without needing a Vercel account

**Tool surface — GitHub tools + local filesystem:**
- GitHub tools via `@github-tools/sdk` with preset selection (code-review, issue-triage, repo-explorer, ci-ops, maintainer)
- Local tools for the checked-out repo: `read_file`, `list_directory`, `search_files` (grep)
- Optional: `run_command` (shell access, disabled by default, opt-in via `tools` input)
- No tool picks/dynamic selection in v1 — use presets to keep context window manageable

**Agent loop — use AI SDK's generateText with maxSteps:**
- `generateText({ model, tools, maxSteps, system, prompt })` handles the loop natively
- Default maxSteps: 15 (enough for meaningful exploration, bounded enough to prevent runaway costs)
- The LLM decides when it has enough context and produces a final text response

**Output:**
- Always set `text` and `json` (if schema provided) as action outputs
- If running on a PR event, optionally post the final response as a PR comment
- Configurable via `comment: true/false` input

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `prompt` | yes | — | The task for the LLM |
| `provider` | no | `anthropic` | LLM provider: `anthropic`, `openai`, `google`, `mistral`, `gateway` |
| `api-key` | yes | — | Provider API key (or Vercel AI Gateway key) |
| `model` | no | provider default | Model identifier (e.g. `claude-sonnet-4-6`, `gpt-4.1`, `gemini-2.5-pro`) |
| `system` | no | built-in | System prompt (override the default) |
| `preset` | no | `code-review` | GitHub tools preset: `code-review`, `issue-triage`, `repo-explorer`, `ci-ops`, `maintainer` |
| `tools` | no | — | Additional tool flags: `local-files`, `shell` (comma-separated) |
| `max-steps` | no | `15` | Maximum agentic loop iterations |
| `comment` | no | `true` | Post result as PR comment |
| `schema` | no | — | JSON Schema for structured output |
| `github-token` | no | `${{ github.token }}` | GitHub token for API tools |

## Outputs

| Output | Description |
|--------|-------------|
| `text` | The LLM's final text response |
| `json` | Structured output (when schema provided) |

## Usage Examples

### Basic PR review with Claude
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR for correctness bugs and suggest improvements"
```

### PR review with OpenAI
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4.1
    prompt: "Review this PR for correctness bugs and suggest improvements"
```

### PR review with Google Gemini
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: google
    api-key: ${{ secrets.GOOGLE_API_KEY }}
    model: gemini-2.5-pro
    prompt: "Review this PR for correctness bugs and suggest improvements"
```

### Via Vercel AI Gateway (40+ providers)
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: gateway
    api-key: ${{ secrets.AI_GATEWAY_KEY }}
    model: anthropic/claude-sonnet-4-6
    prompt: "Review this PR for correctness bugs"
```

### Structured output
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Analyze this PR and categorize the changes"
    schema: '{"type":"object","properties":{"categories":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"files":{"type":"array","items":{"type":"string"}},"risk":{"enum":["low","medium","high"]}}}}}}'
    comment: false
  id: analysis
- run: echo "${{ steps.analysis.outputs.json }}"
```

### Issue triage
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4.1-mini
    preset: issue-triage
    prompt: "Label and prioritize this issue based on the repository context"
```

### With local file access and shell
```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    tools: local-files,shell
    prompt: "Run the test suite and analyze any failures in this PR"
```

## Tech Stack

- **TypeScript** — compiled with `ncc` to a single `dist/index.js` (standard for JS GitHub Actions)
- **`ai` (Vercel AI SDK v5+)** — generateText with tool use and maxSteps for the agent loop
- **`@ai-sdk/anthropic`**, **`@ai-sdk/openai`**, **`@ai-sdk/google`**, **`@ai-sdk/mistral`** — direct provider support
- **`@github-tools/sdk`** — GitHub API tools with presets
- **`@actions/core`** — GitHub Actions I/O
- **`@actions/github`** — GitHub context (PR number, repo, event)
- **`@actions/exec`** — shell command execution (for optional `shell` tool)

## Implementation Phases

### Phase 1: MVP (Target: working action with one provider)
1. Scaffold project: `package.json`, `tsconfig.json`, `action.yml`, `src/main.ts`
2. Implement `resolve-model.ts` — Anthropic provider only (using `@ai-sdk/anthropic`)
3. Implement `resolve-tools.ts` — GitHub tools from `@github-tools/sdk` with preset selection
4. Implement `agent-loop.ts` — `generateText` with tools and maxSteps
5. Implement `output.ts` — post PR comment via `@actions/github`, set action outputs
6. Wire up `main.ts` — read inputs, resolve model, resolve tools, run loop, write outputs
7. Build with `ncc` and test manually on a real PR

### Phase 2: Multi-provider
8. Add `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/mistral` provider resolution
9. Add Vercel AI Gateway support (model string passthrough)
10. Add provider-specific default models
11. Test each provider against a sample PR

### Phase 3: Local tools
12. Implement `read_file` tool (reads from workspace via `fs`)
13. Implement `list_directory` tool (recursive listing with glob support)
14. Implement `search_files` tool (grep-like search)
15. Implement `run_command` tool (gated behind `tools: shell` input)

### Phase 4: Polish
16. Default system prompt with PR context injection (diff summary, changed files list)
17. Structured output support (`schema` input → `generateObject`)
18. Error handling and cost guardrails (maxSteps, token limits)
19. README with examples for each provider
20. GitHub Actions branding metadata
21. Release v1

## File Structure

```
ai-code-action/
├── action.yml
├── package.json
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── test.yml          # test the action on PRs to this repo
├── src/
│   ├── main.ts               # entry point: read inputs → run → write outputs
│   ├── resolve-model.ts      # provider + model string → AI SDK model instance
│   ├── resolve-tools.ts      # preset + flags → tool set
│   ├── agent-loop.ts         # generateText with tools and maxSteps
│   ├── output.ts             # post PR comment, set action outputs
│   └── tools/
│       ├── read-file.ts      # local filesystem read
│       ├── list-directory.ts # directory listing with glob
│       ├── search-files.ts   # grep-like search
│       └── run-command.ts    # shell execution (opt-in)
├── dist/
│   └── index.js              # ncc-compiled bundle (committed)
└── README.md
```

## Open Questions

1. **AI SDK version**: v5 is current, v6/v7 may be needed for `@github-tools/sdk` compatibility. Need to check peer dep requirements.
2. **Provider packages as optional deps**: Should we bundle all provider packages or dynamically install? Bundling with `ncc` is simpler and avoids runtime npm calls.
3. **PR context injection**: Should we automatically fetch the PR diff and include it in the system prompt, or let the LLM discover it via tools? Auto-injecting is faster (fewer tool calls) but uses more input tokens. Could offer both via a `context: auto/tools-only` input.
4. **Comment format**: Single comment that gets updated, or new comment per run? Updated comment avoids spam but loses history.
5. **Rate limiting / cost controls**: Beyond `max-steps`, should we expose `max-tokens` or `budget` inputs?
