# Multiplication Practice

A small, local-first multiplication practice app with standard 0–10 and extended 0–12 ranges.

It is designed for short, repeatable practice without accounts, advertising, tracking, or paid services.

## Practice rules

- Level 1 contains 20 questions, Level 2 contains 30, and Level 3 continues until time expires.
- Each question has three answer choices.
- Level 1 lasts up to 10 minutes; Levels 2 and 3 last 2 minutes.
- Results and corrections appear only after the round.
- Missed facts return in later rounds for extra practice.
- The goal is 100% accuracy, followed by a faster personal-best time.

Level 1 uses the original 20-question, 10-minute format. Level 2 gives 30 questions in 2 minutes. Level 3 is a 2-minute speed round with no question limit.

## Features

- Vertical worksheet-style multiplication problems
- Three large answer choices
- Delayed results and correction review
- Adaptive repeat practice for missed facts
- Standard 0–10 and extended 0–12 number ranges
- Focused practice for any single multiplication table
- Three selectable practice levels with separate records
- Player profiles with separate practice records
- Device-local family leaderboard for perfect rounds
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

Player names, scores, and practice history stay in the current browser. The family leaderboard is visible only on that device. The app does not send or collect personal information.

## Project documents

- `PLAN.md` — roadmap and completion status
- `CHANGELOG.md` — release history
- `CHILD_USABILITY_REVIEW.md` — child-focused review and parent test checklist

## License

Released under the MIT License.
