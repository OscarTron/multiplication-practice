# Multiplication Practice

A small, local-first multiplication practice app for facts from 0 through 12.

It is designed for short, repeatable practice without accounts, advertising, tracking, or paid services.

## Practice rules

- Each round contains 20 randomized questions.
- Each question has three answer choices.
- The round lasts up to 10 minutes.
- Results and corrections appear only after the round.
- Missed facts return in later rounds for extra practice.
- The goal is 100% accuracy, followed by a faster personal-best time.

## Features

- Vertical worksheet-style multiplication problems
- Three large answer choices
- Delayed results and correction review
- Adaptive repeat practice for missed facts
- Device-local records and offline caching
- Responsive keyboard-accessible interface

## Run locally

Open `index.html` directly for basic use. Offline installation requires a local web server:

```powershell
npx serve .
```

Then open the address printed in the terminal.

## Publish free with GitHub Pages

Place this folder in a public GitHub repository, then select **Settings → Pages → Deploy from a branch**. Choose the repository's main branch and root folder.

No account, server, analytics, or paid service is required. Progress remains in the browser's local storage.

## Privacy

All scores and practice history stay in the current browser. The app does not send or collect personal information.

## Project documents

- `PLAN.md` — roadmap and completion status
- `CHANGELOG.md` — release history
- `CHILD_USABILITY_REVIEW.md` — child-focused review and parent test checklist

## License

Released under the MIT License.
