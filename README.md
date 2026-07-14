# ai-code-action

A multi-provider GitHub Action that gives any LLM agentic tool use over your repository. Read files, explore code, analyze PRs, and post comments — with Anthropic, OpenAI, Google, Mistral, or 40+ providers via Vercel AI Gateway.

## Why this exists

Most AI-powered GitHub Actions work like a one-shot question: you send a prompt, the model gives an answer, and that's it. If the model needs to look at your code to answer properly, you have to paste the code into the prompt yourself.

**Agentic tool use** changes that. Instead of one question and one answer, the model gets access to tools — it can read your files, browse your PR diff, search your codebase, and keep going back for more context until it has enough to give a useful response. Think of the difference between asking someone a question over email versus sitting them down at your computer.

The problem is that actions with this capability today only work with a single AI provider. If you're using Claude, great — but if your team uses GPT-4 or Gemini, you're out of luck. And actions that do support multiple providers don't give the model any tools.

This action gives you both: **any provider, with real tool access to your repo**.

| Action | Any provider | Can read your code |
|--------|:-:|:-:|
| claude-code-action | | yes |
| vercel/ai-action | yes | |
| PR-Agent, CodeRabbit | | |
| **ai-code-action** | **yes** | **yes** |

## Quick start

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR for correctness bugs and suggest improvements"
```

## Providers

### Anthropic (default)

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR"
```

Default model: `claude-sonnet-4-6`

### OpenAI

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4.1
    prompt: "Review this PR"
```

Default model: `gpt-4.1`

### Google Gemini

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: google
    api-key: ${{ secrets.GOOGLE_API_KEY }}
    model: gemini-2.5-pro
    prompt: "Review this PR"
```

Default model: `gemini-2.5-flash`

### Mistral

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: mistral
    api-key: ${{ secrets.MISTRAL_API_KEY }}
    prompt: "Review this PR"
```

Default model: `mistral-large-latest`

### Vercel AI Gateway (40+ providers)

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: gateway
    api-key: ${{ secrets.AI_GATEWAY_KEY }}
    model: anthropic/claude-sonnet-4-6
    prompt: "Review this PR"
```

## Presets

Presets control which GitHub API tools the LLM can use. Powered by [@github-tools/sdk](https://github.com/vercel-labs/github-tools).

| Preset | Tools | Use case |
|--------|-------|----------|
| `code-review` (default) | PRs, commits, file content, comments | PR review and feedback |
| `issue-triage` | Issues, labels, search | Labeling and prioritizing issues |
| `repo-explorer` | All read-only tools | Exploring and understanding repos |
| `ci-ops` | Workflows, runs, jobs | CI/CD monitoring and management |
| `maintainer` | All 42 tools | Full repository management |

By default, GitHub write tools (creating comments, issues, merging PRs, etc.) are excluded from the tool set entirely — the model can't see or call them. Set `allow-github-writes: true` to include them.

## Local tools

Add local file access, write capabilities, git operations, and shell execution with the `tools` input:

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    tools: local-files,local-write,git
    prompt: "Fix the typo in README.md and commit the change"
```

| Flag | Tools added | Description |
|------|-------------|-------------|
| `local-files` | `read_file`, `list_directory`, `search_files` | Read and search the checked-out repo |
| `local-write` | `write_file`, `create_directory` | Write files and create directories in the repo |
| `git` | `git_diff`, `git_commit_and_push` | View diffs, commit changes, and push to the current branch |
| `shell` | `run_command` | Execute shell commands (tests, linters, builds) |

Combine them: `tools: local-files,local-write,git,shell`

## Security

### Shell tool

The `run_command` tool gives the LLM full `bash -c` access in the workspace. Commands run with a 60-second timeout and truncated output, but there is no network restriction or command allowlist.

**On `pull_request` events, shell is disabled by default** because PR content (title, body, diff) is auto-injected into the system prompt and is attacker-controlled on public repos. A malicious PR could instruct the model to run arbitrary commands. Set `allow-shell-on-pr: true` only if you understand this risk and have mitigations in place (e.g. private repo, restricted runner, no secrets in the environment).

For non-PR events (e.g. `workflow_dispatch`, `schedule`), shell is allowed but you should still avoid passing untrusted input as the `prompt`.

### Write and git tools

The `local-write` and `git` tool flags let the model modify files and push commits. All file operations are sandboxed to the workspace directory — paths that escape the checkout are rejected. The `git_commit_and_push` tool uses `git add -- <files>` to stage only the paths the model specifies — flags like `-A` or `--all` are treated as pathspecs, not options.

**On `pull_request` events, write and git tools are disabled by default** — the same guard as shell, for the same reason: PR content is attacker-controlled on public repos, and `git_commit_and_push` persists changes to the remote. Set `allow-write-on-pr: true` only if you understand this risk (e.g. private repo, restricted runner).

Note: `allow-github-writes` controls GitHub API write tools (comments, issues, labels). The `git` tool flag is a separate write path that pushes commits directly via git. If you set `allow-github-writes: false` but enable `tools: git`, the model can still mutate the repo through commits. The action logs a warning when this happens.

### GitHub write tools

By default, GitHub write tools are excluded entirely — the model never sees them. Set `allow-github-writes: true` to let the model create comments, issues, labels, etc. via the GitHub API. On public repos with PR triggers, this opens the same prompt injection vector — a malicious diff could instruct the model to post spam or close issues.

### Secrets

The runner environment may contain secrets (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, etc.). With `shell` enabled, a command like `env` could surface these as tool output, which flows into the model response and could be posted as a PR comment. GitHub's log masking does not cover PR comment bodies. Use scoped tokens with minimal permissions and avoid `shell` on public repos.

### `pull_request_target`

**Never use this action with `pull_request_target`** and secrets from the base repo. That trigger runs on the base branch with base-branch secrets but receives the PR head's content — combining it with this action gives an attacker code execution and secret access.

## Structured output

Pass a JSON Schema to get structured output:

```yaml
- uses: owenbush/ai-code-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Categorize the changes in this PR"
    comment: false
    schema: |
      {
        "type": "object",
        "properties": {
          "categories": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "files": { "type": "array", "items": { "type": "string" } },
                "risk": { "enum": ["low", "medium", "high"] }
              }
            }
          }
        }
      }
  id: analysis
- run: echo "${{ steps.analysis.outputs.json }}"
```

## Examples

### PR review with local file context

```yaml
name: AI Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: owenbush/ai-code-action@v1
        with:
          provider: anthropic
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          tools: local-files
          prompt: |
            Review this PR. Focus on:
            - Correctness bugs
            - Security issues
            - Code quality

            Be concise. Only comment on things that matter.
```

### Issue triage

```yaml
name: Triage Issues
on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: owenbush/ai-code-action@v1
        with:
          provider: openai
          api-key: ${{ secrets.OPENAI_API_KEY }}
          model: gpt-4.1-mini
          preset: issue-triage
          allow-github-writes: true
          comment: false
          prompt: "Label and prioritize this issue based on the repository context"
```

### Run tests and analyze failures (non-PR event)

```yaml
name: Test Analysis
on:
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: owenbush/ai-code-action@v1
        with:
          provider: anthropic
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          tools: local-files,shell
          max-steps: 25
          comment: false
          prompt: "Run the test suite and analyze any failures. Suggest fixes."
```

### Auto-fix and commit (non-PR event)

```yaml
name: Auto-fix
on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: owenbush/ai-code-action@v1
        with:
          provider: anthropic
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          tools: local-files,local-write,git
          comment: false
          prompt: "Fix any linting errors in src/ and commit the changes"
```

## Inputs

| Input | Required | Default | Description |
|-------|:--------:|---------|-------------|
| `prompt` | yes | — | The task for the LLM |
| `provider` | | `anthropic` | `anthropic`, `openai`, `google`, `mistral`, `gateway` |
| `api-key` | yes | — | Provider API key |
| `model` | | provider default | Model identifier |
| `system` | | built-in | System prompt override |
| `preset` | | `code-review` | GitHub tools preset |
| `tools` | | — | `local-files`, `local-write`, `git`, `shell` (comma-separated) |
| `max-steps` | | `15` | Maximum agentic loop iterations (1-100) |
| `comment` | | `true` | Post result as PR comment |
| `schema` | | — | JSON Schema for structured output |
| `github-token` | | `${{ github.token }}` | GitHub token |
| `allow-github-writes` | | `false` | Allow model-initiated GitHub API writes |
| `allow-write-on-pr` | | `false` | Allow local-write and git tools on pull_request events |
| `allow-shell-on-pr` | | `false` | Allow shell tool on pull_request events |

## Outputs

| Output | Description |
|--------|-------------|
| `text` | The LLM's final text response |
| `json` | Structured output (when `schema` is provided) |

## How it works

1. Reads action inputs and resolves the LLM provider/model via [Vercel AI SDK](https://ai-sdk.dev)
2. Assembles tools from [@github-tools/sdk](https://github.com/vercel-labs/github-tools) presets + optional local tools
3. Runs an agentic loop (`generateText` with `stopWhen`) — the LLM calls tools iteratively until it has enough context
4. Posts the response as a PR comment (updates existing comment on re-runs) and sets action outputs

## License

MIT
