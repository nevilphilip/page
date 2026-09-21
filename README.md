# Nevil’s Daily Round

A local-first personal productivity and medical learning app for planning the day, capturing clinical learning, preparing for MRCP Part 2, and organising portfolio and project work.

## What works immediately

- Daily priorities, shift-aware guidance, tasks, inbox and evening review
- An anonymised clinical case log with case-to-learning workflow
- Learning notes, review dates and spaced-review controls
- MRCP question-bank session logging with accurate totals
- Portfolio and project workspaces
- Dark mode and responsive mobile navigation
- Local browser persistence, JSON backup/restore and case CSV export
- Honest offline states for Google Calendar and AI

Data is stored only in the current browser. It is not encrypted, synchronised, or committed to Git. Make regular JSON backups.

## Run locally

Requirements: Node.js 22+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Build

```bash
pnpm build
```

The static site is written to `out/`. The app uses a single route, so navigation continues to work after refresh and under a GitHub Pages repository subpath.

## Deploy on GitHub Pages

1. Create a GitHub repository and push this folder to the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. Push to `main`, or run the **Deploy to GitHub Pages** workflow manually.

The included workflow detects the repository name and builds with the correct asset subpath.

## Optional integrations

Google Calendar private-event reading requires a Google OAuth client and should request read-only calendar permission. AI explanations require a separately deployed authenticated backend or serverless service with rate limiting and a configurable usage cap. Never put provider secrets in frontend code, browser storage, GitHub Actions variables exposed to the client, or the repository.

Until these services are configured, all manual features remain usable and the Learning and Ask pages provide safe copy-prompt fallbacks.

## Privacy

This is an educational log, not a patient record or handover tool. Never enter names, NHS or hospital numbers, dates of birth, bed numbers, identifiable documents, or other patient-identifying details.
