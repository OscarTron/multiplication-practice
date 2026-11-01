# Changelog

All notable changes to Multiplication Practice will be recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned

- Daily practice tracking and progress history.
- Child usability and cross-browser testing.

### Added

- Practice settings for standard 0–10 and extended 0–12 ranges.
- Single-table filters that remain active until cleared.
- Level 2 with 30 questions in 2 minutes and Level 3 with unlimited questions in 2 minutes.
- Separate player records and leaderboards for each range, table filter, and level.
- Device-local player names with separate records and missed-fact practice.
- Family leaderboard ranking each player’s fastest perfect round.
- Adaptive review queue that returns missed facts in later rounds.
- Review weighting that increases after mistakes and decreases after correct answers.
- Review-queue count in personal records and the active-round status strip.
- Vertical multiplication layout inspired by familiar worksheet notation.

### Changed

- Made Level 1 with mixed 0–10 facts the default practice mode.
- Simplified adaptive-practice wording for younger readers.
- Prepared standalone public-repository documentation and MIT licensing.
- Published the initial public repository and GitHub Pages site.
- Introduced an original learning-game visual system with a controlled teal, navy, coral, and yellow palette.
- Improved mobile proportions, button tactility, progress hierarchy, and results presentation.

### Fixed

- Versioned app assets so existing offline installations receive new code after updates.
- Prevented rapid or queued double-clicks from recording two answers or skipping a question.

## [0.1.0] - 2026-11-01

### Added

- Twenty-question rounds covering multiplication facts from 0 through 12.
- Three shuffled answer choices per question.
- Ten-minute countdown with automatic round completion.
- End-of-round score, elapsed time, and correction review.
- Randomized replay and device-local personal records.
- Responsive, keyboard-accessible interface.
- Installable manifest and offline application cache.
