# Contributing

Thank you for your interest in Multiplication Practice.

## Product Principles

- Keep the experience simple and child-friendly.
- Prioritize accuracy before speed.
- Preserve local-first privacy and avoid unnecessary services.
- Keep the core application usable without a build process.
- Maintain clear behavior on both mobile and desktop.

## Local Setup

```bash
git clone https://github.com/OscarTron/multiplication-practice.git
cd multiplication-practice
python -m http.server 8000
```

Open `http://localhost:8000` in a browser.

## Before Submitting a Change

1. Test the complete behavior you changed.
2. Check the layout at mobile and desktop widths.
3. Confirm player records and settings still persist after a reload.
4. Run JavaScript syntax checks:

   ```bash
   node --check app-v8.js
   node --check service-worker.js
   ```

5. Update `CHANGELOG.md` for user-visible changes.
6. Advance service-worker and asset cache versions together when changing published assets.

## Code Style

- Prefer small, direct functions and clear ownership of state.
- Use semantic HTML and accessible labels.
- Keep desktop defaults outside media queries and mobile overrides inside them.
- Avoid introducing dependencies when the browser platform already provides the needed capability.
- Preserve existing element IDs unless all consumers are updated together.

## Commits and Pull Requests

Use concise Conventional Commit subjects where practical, such as:

- `feat: add achievement badges`
- `fix: preserve focused-table setting`
- `style: align mobile controls`
- `docs: clarify local setup`

Pull requests should explain the user-facing problem, the approach, and the checks that were actually performed.
