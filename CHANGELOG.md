# Changelog

All notable changes to Multiplication Practice will be recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned

- Daily practice tracking and progress history.
- Child usability and cross-browser testing.

### Added

- A compact recent-progress summary with five-round average, score change, and best perfect time.
- A Learn section with an interactive multiplication chart and five-minute multi-table flashcards.
- A five-minute Student practice option.
- A Student practice-time setting with 10, 20, and 30-minute options.
- Home navigation from the results screen.
- Per-player round history with an on-screen progress table and CSV download.
- Correct and incorrect answer animations with optional device-generated tones.
- A saved sound-effects setting that defaults to off.
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

- Standardized mobile control heights, spacing, corner radii, and shadows without changing the desktop layout.
- Standardized headings, buttons, settings, and compact labels using consistent title capitalization.
- Standardized key home-screen labels in title case and renamed Study Cards to Flash Cards.
- Reordered the home screen around Start Practice and grouped records, leaderboard, and history under My Progress.
- Standardized primary and secondary controls and fitted the complete multiplication chart on mobile.
- Replaced the large motivational introduction with a compact practice heading and round summary.
- Standardized the interface around one content width, one control height, four text sizes, and consistent spacing.
- Reduced headline size and font-weight variation for a calmer, more symmetrical start screen.
- Introduced an original, offline sci-fi interface typography treatment.
- Renamed the three levels Student, Scholar, and Prodigy.
- Made Level 1 with mixed 0–10 facts the default practice mode.
- Simplified adaptive-practice wording for younger readers.
- Prepared standalone public-repository documentation and MIT licensing.
- Published the initial public repository and GitHub Pages site.
- Introduced an original learning-game visual system with a controlled teal, navy, coral, and yellow palette.
- Improved mobile proportions, button tactility, progress hierarchy, and results presentation.

### Removed

- The temporary procedural DnB study loop and Music setting.

### Fixed

- Moved the mobile settings summary to a readable second line.
- Hid inactive timers and aligned mobile navigation, progress, and utility controls.
- Made table-filter options available directly in the page instead of depending on JavaScript to create them.
- Replaced unsupported newer JavaScript syntax for compatibility with older mobile browsers.
- Changed offline loading to prefer the newest published files before cached copies.
- Versioned app assets so existing offline installations receive new code after updates.
- Prevented rapid or queued double-clicks from recording two answers or skipping a question.

### Removed

- Temporary emoji animal profiles pending original character designs.

## [0.1.0] - 2026-11-01

### Added

- Twenty-question rounds covering multiplication facts from 0 through 12.
- Three shuffled answer choices per question.
- Ten-minute countdown with automatic round completion.
- End-of-round score, elapsed time, and correction review.
- Randomized replay and device-local personal records.
- Responsive, keyboard-accessible interface.
- Installable manifest and offline application cache.
