# Dune IMAX watcher

Checks Cinema City Kraków every 30 minutes for **new IMAX showings of Dune: Part Three
in English with Polish subtitles**, and sends an email + phone push when one appears.

- Runs on GitHub Actions (`.github/workflows/watch.yml`), no server needed.
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

## Watching it

- Every run appears in the **Actions** tab. Open a run to see a summary table of all
  matching showings and how full they are.
- A failed run turns red, and GitHub emails you about it.
- No alert means "running fine, nothing new".

## Stopping

Actions tab → the workflow → **⋯** → **Disable workflow**.

## Development

```bash
npm test     # unit tests
npm start    # one real check (prints the summary; sends only if something is new)
```
