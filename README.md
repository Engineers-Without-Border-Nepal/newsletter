# Engineers Without Borders — Nepal Newsletter

This repository contains a simple newsletter-sending utility used by Engineers Without Borders (EWB) Nepal to deliver HTML newsletter editions to subscribers stored in Firestore. The project demonstrates a minimal Node.js-based mailer that personalizes HTML templates and sends them via SMTP (Gmail) using `nodemailer`.

## What this repo contains

- `scripts/send_email.js` — main script that reads an HTML template, fetches active subscribers from Firestore, personalizes the content per-subscriber, and sends the email via SMTP.
- `serviceAccountKey.json` — Firebase service account credentials (KEEP PRIVATE — do not commit).
- `.env` (not present) — expected to contain SMTP credentials (see Setup).
- `newsletters/` — folder containing HTML newsletter templates (e.g. `july_edition.html`, `march_edition.html`, `october_edition.html`).
- `styles.css` — optional global styles used by templates.

> Note: `scripts/send_email.js` loads the HTML template with a relative path (`../july_edition.html`) from the `scripts/` folder. You can either move a template into the project root (e.g., copy `newsletters/july_edition.html` to the repository root as `july_edition.html`) or edit the script to point to `../newsletters/july_edition.html`.

## Quick contract (inputs / outputs / success)

- Inputs: `.env` with `EMAIL_USER` and `EMAIL_PASSWORD`, `serviceAccountKey.json` with valid Firebase credentials, an HTML template file, and active subscriber records in Firestore collection `stars`.
- Output: one email per active subscriber; `scripts/email_stars_log.txt` records per-email success/fail.
- Success criteria: script runs without errors, and a majority of `transporter.sendMail` calls return success (check log file and console output).

## Prerequisites

- Node.js (v16+ recommended). This project uses `nodemailer`, `firebase-admin`, and `dotenv` (see `package.json`).
- Access to a Firebase project and a Firestore database with a `stars` collection.
- A Gmail account configured with an App Password (recommended) or SMTP access.

## Install

1. Install dependencies:

```powershell
npm install
```

2. Add environment variables. Create a `.env` file in the repository root (next to `package.json`) with the following values:

```text
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

Use an App Password if your Google account has 2FA enabled. Do NOT use your primary account password if your account requires 2FA.

3. Put your Firebase service account JSON at `serviceAccountKey.json` in the repository root. This file is required for `firebase-admin` to connect to Firestore.

Important: Add the following to your `.gitignore` to avoid accidentally committing sensitive files:

```
serviceAccountKey.json
.env
```

## Configure templates and Firestore

- Templates: Edit or create HTML templates. The script currently reads `../july_edition.html` relative to `scripts/`. If your templates are inside the `newsletters/` folder, either update `send_email.js` to read from that folder or copy the template to the repo root.
- Firestore subscribers: The script queries the `stars` collection for documents with `isActive == true`. Each document should contain at least:
	- `email` (string) — recipient email address
	- `userId` (string) — used by the script to personalize links inside templates
	- `isActive` (boolean) — when true, the user receives mail

Example document shape:

```json
{
	"email": "jane@example.com",
	"userId": "abc123",
	"isActive": true
}
```

## Running the script

From the repository root run:

```powershell
node scripts/send_email.js
```

If you plan to run this often, add an npm script to `package.json`:

```json
"scripts": {
	"send": "node scripts/send_email.js"
}
```

Then run:

```powershell
npm run send
```

## Personalization

The script includes a `personalizeEmailContent` function that performs a simple string replacement for a placeholder link containing `userid=409238740234`. Make sure your newsletter HTML contains that placeholder (or update the function to match your template's placeholder) so each recipient's links include their `userId`.

## Logs

The script appends a small CSV-style log to `scripts/email_stars_log.txt` with lines like `email,success` or `email,fail` for quick post-run inspection.

## Troubleshooting

- Missing environment variables: script prints whether `EMAIL_USER` and `EMAIL_PASSWORD` were loaded.
- Gmail auth failures: create an App Password (recommended) and use it in `.env` as `EMAIL_PASSWORD`.
- Firestore permission errors: ensure `serviceAccountKey.json` is for a service account with Firestore read permissions.
- Template file not found: adjust `send_email.js` template path or place the HTML template at the expected location.

## Security notes

- Never commit `serviceAccountKey.json` or `.env` to version control.
- Use least privilege for the Firebase service account (only Firestore read permissions required).
- Consider implementing batching, rate-limiting, and retry logic for large mailing lists.

## Contributing

If you'd like to contribute:

1. Fork the repository.
2. Create a feature branch (e.g., `feature/improve-paths`).
3. Open a pull request describing your changes.

Suggestions that help this project:
- Add a configurable path for templates (read from `.env` or CLI args).
- Add command-line flags to choose which template to send.
- Add tests for personalization logic and Firestore querying.

## Contact

For questions or coordination, email the EWB Nepal communications lead (replace with the official contact): contact@ewb.org.np

---

If you'd like, I can also:

- Add an `npm` script (`send`) to `package.json`.
- Update `send_email.js` to read templates from `newsletters/` by default and add a CLI flag to pick an edition.

Tell me which of the above you'd like me to do next.

