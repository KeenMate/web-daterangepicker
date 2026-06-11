---
description: Prepare @keenmate/web-daterangepicker for npm publish — bump version, finalize CHANGELOG/README, build, test, commit
argument-hint: rc|release|patch|minor|major
---

# /publish — prepare an npm release of @keenmate/web-daterangepicker

You are preparing this package for `npm publish`. **Do not run `npm publish`** — the user logs in and publishes manually.

## Argument

The release type: **$ARGUMENTS**

Must be one of:

- `rc` — ship the WIP rc as-is. The topmost CHANGELOG heading (e.g. `## [1.16.0-rc01] - 2026-06-11`) gets ` [PUBLISHED]` appended. Rare in this repo today, but supported for future use.
- `release` — promote a WIP rc to a final release. `1.16.0-rcN` → `1.16.0`. CHANGELOG heading is renamed to match the new version.
- `patch` — SemVer patch bump. Drops any `-rc` suffix. `1.16.1-rcN` → `1.16.1`, `1.16.0` → `1.16.1`.
- `minor` — SemVer minor bump. Drops `-rc`. Resets patch.
- `major` — SemVer major bump. Drops `-rc`. Resets minor and patch.

If missing or invalid, stop and ask the user which one to use (don't guess).

## Repo layout

Single-package repo, everything at root:

- **`package.json`** — `version` field is the source of truth.
- **`package-lock.json`** — must be re-synced after every bump (`npm install --package-lock-only`).
- **`CHANGELOG.md`** — at the root. Topmost `## [X.Y.Z] - YYYY-MM-DD` heading **without** the `[PUBLISHED]` marker is the WIP section.
- **`README.md`** — at the root. Carries `## What's New in vX.Y.Z` sections near the top (one per release, the **two most recent** retained). The current WIP cycle must already have a `## What's New in vWIP_VERSION` section in place before `/publish` runs — writing the highlights is curatorial, not mechanical.
- **`dist/`** — gitignored. Produced by `npm run build` (Vite). Never staged.

## CHANGELOG convention in this repo

There is **no `## [Unreleased]` section** (post-v1.15.0). The WIP section is the topmost `## [X.Y.Z] - YYYY-MM-DD` heading without a `[PUBLISHED]` tag. Already-released sections carry `[PUBLISHED]` at the end of their heading:

```
## [1.16.0] - 2026-06-11                  ← WIP, the one you're shipping
### Added
- ...

## [1.15.0] - 2026-05-27 [PUBLISHED]
### Added
- ...
```

Publishing the WIP section means **appending ` [PUBLISHED]`** to its heading — exact format: `## [X.Y.Z] - YYYY-MM-DD [PUBLISHED]`. The next development cycle creates a fresh `## [next-version] - <date>` heading on its first CHANGELOG edit.

Historical sections through 1.12.0 use the old format (`## [X.Y.Z] - YYYY-MM-DD - PUBLISHED`); 1.13.0/1.14.0/1.15.0 silently shipped without any marker. Don't retro-fix any of them — only finalize the section you're shipping using the new bracket format. Substring searches for `PUBLISHED` still work across all three formats.

## Resolve versions

Read `./package.json` `version` as `CURRENT_VERSION`.
Read the topmost `## [X.Y.Z...]` heading from `./CHANGELOG.md` as `WIP_VERSION`.

Compute `NEW_VERSION`:

| Argument | Logic |
|---|---|
| `rc` | If `CURRENT_VERSION` matches `X.Y.Z-rcN`, `NEW_VERSION = CURRENT_VERSION` (no bump — we're shipping what's already in package.json). If `CURRENT_VERSION` is not an rc, stop and ask the user (they probably wanted `release`/`patch`/etc.). |
| `release` | If `CURRENT_VERSION` matches `X.Y.Z-rcN`, `NEW_VERSION = X.Y.Z`. Otherwise stop. |
| `patch` | Strip any `-rcN`, then bump patch. |
| `minor` | Strip any `-rcN`, then bump minor, reset patch. |
| `major` | Strip any `-rcN`, then bump major, reset minor and patch. |

If `WIP_VERSION` ≠ `NEW_VERSION` (e.g. the WIP is `1.16.0-rc01` but the user asked for `release`), the CHANGELOG heading rename in step 3 also re-tags the section to `NEW_VERSION` — call this out in the report so the user notices.

**Known data drift**: `package.json` may lag the CHANGELOG (e.g. the v1.13.0/1.14.0/1.15.0 release commits didn't always re-sync `package.json`). If `CURRENT_VERSION` is lower than `WIP_VERSION` by more than one minor/patch step, warn the user and ask whether to bump straight to `NEW_VERSION` or first reconcile.

## Steps (in order)

### 1. Sanity checks

- Run `git status`. The repo intentionally keeps `.claude/`, `test-results/`, and similar local-only paths untracked — those are fine. If there are **other** uncommitted changes that aren't `CHANGELOG.md`, `README.md`, `package.json`, or `package-lock.json`, list them and ask the user before continuing. (Typical case: substantive source changes belonging in this release that haven't been committed yet — confirm they're intended for this version before bumping.)
- **Verify the new version isn't already on npm.** Run `npm view @keenmate/web-daterangepicker@<NEW_VERSION> version 2>/dev/null` — if it returns the version string, that version is already published and **stop**: bumping over it would fail at publish time and pollute the commit. Also run `npm view @keenmate/web-daterangepicker version` to fetch the latest published version; if it's higher than `NEW_VERSION`, warn the user (mismatch between local package.json history and the registry) and ask before continuing.
- Confirm the WIP CHANGELOG section has at least one bullet of substantive content under `### Added`, `### Changed`, `### Removed`, `### Fixed`, `### Internal`, or `### Notes`. If empty, stop — there's nothing meaningful to release.
- Confirm `./README.md` has a `## What's New in vWIP_VERSION` section. If it's missing, draft one from the CHANGELOG and present it to the user for approval before continuing:
  - Read the WIP CHANGELOG section, distill it to 5–8 scannable bullets covering the Added/Changed themes (paraphrase, don't copy CHANGELOG bullets verbatim — those are exhaustive; What's New is the highlight reel). Pure internal refactors and Fixed-only entries don't need coverage, though headline bug fixes worth advertising are worth a bullet. Follow the formatting of existing `## What's New in vX.Y.Z` sections in the README (bold lead phrase + em-dash + 1–2 sentence explanation).
  - Show the user the proposed draft as plain markdown in your reply. Ask whether to (a) insert as-is, (b) edit, or (c) abort so they can write it themselves.
  - Only proceed past step 1 once the user approves the draft (or supplies their own). On approval, insert the section directly above the current top `## What's New in vX.Y.Z` heading in `README.md`, then continue.
  - Do not silently insert the draft without confirmation — release highlights are a writing call and the user owns the voice.

### 2. Bump version (if needed)

If `NEW_VERSION` ≠ `CURRENT_VERSION`, edit `./package.json` and change `"version": "CURRENT_VERSION"` to `"version": "NEW_VERSION"`.

Re-sync the lockfile: `npm install --package-lock-only`. Confirm the resolved `@keenmate/web-daterangepicker` entry in `package-lock.json` now shows `NEW_VERSION` too. Peer-dep warnings during the sync are fine; stop only on a hard error.

For `rc` arg this is normally a no-op — version was bumped earlier in the development cycle.

### 3. Finalize CHANGELOG

In `./CHANGELOG.md`:

- If `WIP_VERSION` ≠ `NEW_VERSION` (e.g. promoting `1.16.0-rc01` → `1.16.0`), rename the WIP heading from `## [WIP_VERSION] - <date>` to `## [NEW_VERSION] - <today>` (today's date from system context).
- If `WIP_VERSION` == `NEW_VERSION`, leave the bracketed version alone but update the date to today **if** the existing date is stale (more than a few days old). The WIP date is usually whatever the day the section was opened; refresh it so the changelog reflects the actual ship date.
- In either case, **append ` [PUBLISHED]`** to the heading so it reads exactly: `## [NEW_VERSION] - YYYY-MM-DD [PUBLISHED]`.
- Leave all bullet content untouched.
- **Do not** create an empty new WIP section — the next dev cycle's first CHANGELOG edit will create one.

### 4. Update README "What's New" — only if version changed

In `./README.md`:

- If the existing `## What's New in vWIP_VERSION` section's version differs from `NEW_VERSION` (e.g. promoting `1.16.0-rc01` → `1.16.0`), rename its heading to `## What's New in vNEW_VERSION`. (No content rewrites — the text was already curated for this release.)
- Then count the `## What's New in vX.Y.Z` headings. If there are more than **two**, delete the oldest ones so only the **two most recent** remain (the just-finalized one plus the one before it).

For `rc` arg this is normally a no-op on the heading itself — only trims if someone left an extra-old section behind.

### 5. Validate README reflects the release

Read both the finalized CHANGELOG section and the matching `What's New in vNEW_VERSION` section. Every **Added** or **Changed** bullet in the CHANGELOG that represents a user-facing feature or behavior change should have a corresponding hit in the What's New section (paraphrased, not verbatim). Pure internal refactors and `Fixed`-only entries don't need coverage, though headline bug fixes worth advertising (e.g. "X used to silently fail; now works") are worth a bullet.

If you find a significant CHANGELOG entry that isn't reflected in What's New, add a bullet for it. If the section ends up with more than ~8 bullets after this pass, condense — What's New should be scannable, not exhaustive.

### 6. Validate CHANGELOG entries match recent work

Find the previous `PUBLISHED` tag in CHANGELOG (the version just before NEW_VERSION) and locate the commit that bumped to it — usually a commit whose subject starts with `v<previous-version>` or `- v<previous-version>`. Run `git log --oneline <previous-publish-commit>..HEAD` to list commits since.

Also check `git diff` (or `git status`) for any uncommitted source/test work outside the files you're editing in this command.

For every substantive commit or uncommitted change, verify the WIP CHANGELOG section mentions it. If something significant is missing, **stop and ask the user** before finalizing — don't invent entries on their behalf. Pure example/doc tweaks and trivial typo fixes don't need entries.

### 7. Run e2e tests

Run `npm run test:e2e` (or equivalently `make test-e2e`). All specs must pass.

If anything fails, **stop and report**. Do not proceed to build/commit. The user fixes the regression (or decides to fixme the spec) before the publish flow can continue.

If Playwright complains that chromium isn't installed, suggest `make test-e2e-install` and stop.

### 8. Build the package

Run `npm run build` (or `make build`). This:
- Cleans `dist/` (`npm run clean:dist`).
- Runs Vite to emit `dist/web-daterangepicker.js`, `dist/web-daterangepicker.umd.js`, `dist/style.css`, and the type declarations under `dist/`.

If the build errors, stop and report.

After build, do a quick smoke check on the emitted artifacts:
- `dist/web-daterangepicker.js` and `dist/web-daterangepicker.umd.js` both exist and are non-empty.
- `dist/style.css` exists.
- `dist/index.d.ts` (the `types` field target) exists.

### 9. Verify the package contents

Run `npm pack --dry-run` (or `npm run package` followed by inspecting the tarball list) and confirm the file list includes `dist/`, `src/css/`, `component-variables.manifest.json`, `README.md`, and `package.json`. The repo currently has no top-level `LICENSE` file — if you see one being shipped, fine; if not, don't flag it as missing. If anything user-facing is missing or anything private leaked in (e.g. `test/`, `e2e/`, `examples-*.html`, `ai/`, `TASK-*.md`), stop and report — the `files` field in `package.json` controls this and the leak needs fixing before publish.

### 10. Commit

Stage:
- `./CHANGELOG.md`
- `./README.md`
- `./package.json`
- `./package-lock.json`

Do **not** stage `dist/` — it's gitignored.

Commit message format — mirror the cross-component convention (matches web-multiselect's recent release commits):

```
vNEW_VERSION - <one-line summary of the headline change>

<grouped bullets paraphrased from the CHANGELOG section — split into the same
groups the CHANGELOG used: Added, Fixed, Changed, Internal, etc. Keep bullets
terse; full prose lives in the CHANGELOG.>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

This is a deliberate shift from the older single-line `vX.Y.Z - dash-separated phrases` style used through v1.15.0 (see commits `2e063fc`, `a542442`). The grouped-bullets style matches what web-multiselect uses and what other KeenMate libraries are adopting.

### 11. Report

Report back with:

- The new version number
- The commit SHA
- The exact commands to publish. **Pick the right one for the arg type:**
  - For `rc` (publishing a pre-release):
    ```
    npm login          # if not already logged in
    npm publish --tag rc
    ```
    The `--tag rc` is critical — without it npm assigns the `latest` dist-tag, which would make the pre-release the default install for everyone running `npm install @keenmate/web-daterangepicker`. With `--tag rc`, the `latest` tag stays put and consumers opt in via `@rc` or pinning the exact version.
  - For `release` / `patch` / `minor` / `major` (publishing a stable release):
    ```
    npm login          # if not already logged in
    npm publish
    ```
    Or `make publish`. No `--tag` needed — it correctly lands as `latest`.
- A reminder that the CHANGELOG `[PUBLISHED]` tag is now in place — if `npm publish` fails, the user should revert the commit (`git reset --hard HEAD~1`) before retrying, since the registry will refuse to re-publish the same version.

## Things not to do

- **Do not run `npm publish`.** The user publishes manually after `npm login`.
- **Do not push to git remote.** The commit stays local until the user pushes.
- **Do not create an empty `[Unreleased]` or new WIP heading** in CHANGELOG after finalizing — the next dev cycle's first edit creates the next heading.
- **Do not retro-fix older CHANGELOG sections** that are missing the `PUBLISHED` tag (1.13.0/1.14.0/1.15.0 silently shipped without one; pre-1.13 use the `- PUBLISHED` suffix instead of `[PUBLISHED]`) — historical convention isn't uniform and editing prior sections noises up the diff.
- **Do not silently insert a drafted What's New section.** If you draft one in Step 1 because it's missing, you must present it and wait for explicit approval (or edits) before inserting — the writing voice is the user's call, even when you're handing them a starting point.
- **Do not keep more than two `## What's New in vX.Y.Z` sections in the README.** Step 4 trims older ones; if you see three or more after Step 4, you missed one.
- **Do not skip `npm install --package-lock-only`.** A stale `package-lock.json` after a version bump confuses downstream consumers.
- **Do not skip `npm run build`** — without it `dist/` is stale and the publish would ship outdated artifacts (or fail entirely if `dist/` was wiped by `make clean`).
- **Do not skip the e2e run** — this repo's tests have caught real regressions and the gate is explicit.
- **Do not invent CHANGELOG entries** to cover commits you find; ask the user if something's missing.
- **Do not bump if there's nothing meaningful in the WIP section** — stop and explain.
- **Do not stage `test/`, `e2e/`, `test-results/`, `ai/`, `examples-*.html`, or `TASK-*.md`** — they're either ignored, test artifacts, or local-only working files.
