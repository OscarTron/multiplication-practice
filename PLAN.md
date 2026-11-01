# Multiplication Practice — Project Plan

## Product goal

Help a child build fast, accurate recall of multiplication facts from 0 through 12 with short, repeatable practice rounds.

## Phase 1 — One-day MVP

- [x] Create a clean, responsive practice screen.
- [x] Generate 20 mixed multiplication questions using factors 0–12.
- [x] Show three shuffled answer choices for every question.
- [x] Record answers without revealing correctness during the round.
- [x] Add a 10-minute countdown timer.
- [x] Show score, elapsed time, and corrections after the round.
- [x] Allow immediate randomized replay.
- [x] Save the best score and fastest 100% time on the device.
- [x] Add basic offline support.
- [x] Complete a browser test of the 20-question flow, scoring, corrections, replay, and saved records.
- [x] Complete a final browser round with physical double-click protection verified.
- [x] Complete a child-focused heuristic usability review.
- [ ] Complete child usability testing and adjust wording or sizing.
- [x] Publish the public repository and enable GitHub Pages.

## Phase 2 — Smarter practice

- [x] Prioritize facts answered incorrectly in earlier rounds.
- [x] Maintain an on-device review queue that shrinks after correct answers.
- [x] Browser-test missed-fact capture and inclusion in the following round.
- [ ] Track lifetime accuracy by multiplication fact.
- [x] Add focused practice by table while keeping mixed practice as the default.
- [x] Make 0–10 the standard range with an optional 0–12 extension.
- [x] Add Student, Scholar, and Prodigy levels with separate records.
- [x] Rename the levels Student, Scholar, and Prodigy.
- [x] Add correct and incorrect feedback effects with optional sound.
- [ ] Add a simple 30-minute daily-practice indicator.

## Phase 3 — Motivation and progress

- [x] Add player names with separate on-device practice records.
- [x] Add a local family leaderboard for fastest perfect rounds.
- [ ] Add optional streaks and achievement badges.
- [ ] Add a private, on-device progress chart.
- [ ] Add parent-controlled reset and data export.
- [ ] Review accessibility with keyboard and screen-reader testing.

## Phase 4 — Release quality

- [ ] Test on current Chrome, Edge, Firefox, and Safari.
- [ ] Test installation and offline use on desktop and mobile.
- [x] Prepare standalone repository documentation, ignore rules, and an open-source license.
- [x] Publish version 0.1.0 through GitHub Pages.
- [ ] Add screenshots and contribution guidance.
- [ ] Tag the first stable release.

## Product rules

- Keep the experience simple and distraction-free.
- Store progress only on the device; do not require accounts or analytics.
- Separate accuracy from speed: 100% accuracy comes first.
- Do not reveal answers until the round is finished.
- Keep the core app free of build tools and paid services.
