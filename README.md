# Dune IMAX watcher

Checks Cinema City Kraków every 30 minutes for **new IMAX showings of Dune: Part Three
in English with Polish subtitles**, and sends an email + phone push when one appears.

- Runs on GitHub Actions (`.github/workflows/watch.yml`), no server needed.
- **Triggered every 30 minutes by [cron-job.org](https://cron-job.org)**, which calls GitHub's
  `workflow_dispatch` API. GitHub's own `schedule` trigger is best-effort and fired only once in the
  first ~23 hours on this new repo. It stays in the workflow as a backup; extra runs are harmless because
  a showing never alerts twice.
- Reads the same public JSON API the cinema-city.pl page uses.
- Remembers which showings it has already reported in `seen.json`, so each showing is reported once.
- First run sends a single "watcher is live" message.
- No dependencies: Node 24 runs the TypeScript directly.

## Setup

1. **Email:** create a free [Resend](https://resend.com) account, then create an API key.
   Emails come from `onboarding@resend.dev` and can only go to the email address of your Resend account.
2. **Push:** install the **ntfy** app (iOS/Android) and subscribe to a topic with a long random
   name, such as the output of `openssl rand -hex 12`. Anyone who knows the topic name can read it.
3. **Secrets** (repo → Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `RESEND_API_KEY` | your Resend API key |
   | `ALERT_EMAIL` | the email of your Resend account |
   | `NTFY_TOPIC` | your ntfy topic name |

4. Actions tab → **Watch Dune IMAX showings** → **Run workflow** to test.
5. **External trigger:** create a fine-grained GitHub token (this repo only, *Actions: Read and write*),
   then a cron-job.org job, every 30 minutes:
   - `POST https://api.github.com/repos/maksim-karatkevich/dune-imax-watcher/actions/workflows/watch.yml/dispatches`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`,
     `X-GitHub-Api-Version: 2022-11-28`, `Content-Type: application/json`
   - Body: `{"ref":"main"}`. Expect `204 No Content`.

   The token expires (the current one on 2027-01-26). After that, runs quietly stop, so renew it if the watch is still needed.

## Watching it

- Every run appears in the **Actions** tab. Open a run to see a summary table of all
  matching showings and how full they are.
- A failed run turns red, and GitHub emails you about it.
- No alert means "running fine, nothing new".

## Stopping

Disable the cron-job.org job, then Actions tab → the workflow → **⋯** → **Disable workflow**.
Delete the GitHub token too.

## Development

```bash
npm test     # unit tests
npm start    # one real check (prints the summary; sends only if something is new)
```
