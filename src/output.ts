import * as core from '@actions/core'
import * as github from '@actions/github'

const COMMENT_MARKER = '<!-- ai-code-action -->'

export interface OutputOptions {
  text: string
  json?: string
  comment: boolean
  githubToken: string
}

async function findMarkerComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<number | null> {
  let page = 1
  while (true) {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
      page,
    })

    const existing = comments.find((c) => c.body?.startsWith(COMMENT_MARKER))
    if (existing) return existing.id

    if (comments.length < 100) return null
    page++
  }
}

export async function writeOutput(options: OutputOptions): Promise<void> {
  core.setOutput('text', options.text)

  if (options.json) {
    core.setOutput('json', options.json)
  }

  if (!options.comment) return

  const pr = github.context.payload.pull_request
  if (!pr) {
    core.info('Not a PR event — skipping comment')
    return
  }

  const octokit = github.getOctokit(options.githubToken)
  const { owner, repo } = github.context.repo
  const body = `${COMMENT_MARKER}\n${options.text}`

  const existingId = await findMarkerComment(
    octokit,
    owner,
    repo,
    pr.number,
  )

  if (existingId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body,
    })
    core.info(`Updated comment on PR #${pr.number}`)
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr.number,
      body,
    })
    core.info(`Posted comment on PR #${pr.number}`)
  }
}
