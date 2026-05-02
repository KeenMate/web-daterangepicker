---
description: Prepare web-daterangepicker for npm publish — bump version, finalize CHANGELOG, validate, commit
argument-hint: patch|minor|major
---

# /publish — prepare an npm release

You are preparing this repository (`@keenmate/web-daterangepicker`) for `npm publish`. **Do not run `npm publish`** — the user logs in and publishes manually.

## Argument

The release bump type: **$ARGUMENTS**

Must be one of `patch`, `minor`, `major`. If missing or invalid, stop and ask the user which one to use (don't guess).

## Target package

This repo has a single root `package.json` (`@keenmate/web-daterangepicker`). Read its current version as `CURRENT_VERSION`. Compute `NEW_VERSION` by bumping per the arg (semver):
- `patch`: 1.11.0 → 1.11.1
- `minor`: 1.11.0 → 1.12.0
- `major`: 1.11.0 → 2.0.0

## Required files

- `package.json` — version will be bumped
- `package-lock.json` — must be re-synced after bump
- `CHANGELOG.md` — must have an `## [Unreleased]` section with content

`README.md` does **not** maintain per-version "What's New" sections — its `## Changelog` block just links to `CHANGELOG.md`. Don't add per-version content to README; keep the link-based pattern.

## Steps (in order)

### 1. Sanity checks

- Run `git status`. If the working tree has uncommitted changes other than the files you're about to touch (`package.json`, `package-lock.json`, `CHANGELOG.md`), warn the user and ask before continuing. Small in-flight edits to those three are fine to roll into the release commit.
- Confirm `CHANGELOG.md` has an `## [Unreleased]` section with at least one bullet under it. If empty, stop — there's nothing meaningful to release.
- Run `npm run build` to confirm the build is clean before tagging the release. If it fails, stop and report.

### 2. Bump version

Edit `package.json`: change `"version": "CURRENT_VERSION"` to `"version": "NEW_VERSION"`.

Re-sync the lockfile: `npm install --package-lock-only`. Confirm the resolved `@keenmate/web-daterangepicker` entry in `package-lock.json` now shows `NEW_VERSION` too.

### 3. Finalize CHANGELOG

In `CHANGELOG.md`:
- Rename the `## [Unreleased]` heading to `## [NEW_VERSION] - YYYY-MM-DD - PUBLISHED` using **today's date** (check the system context for `Today's date`; never guess).
- Note the convention: `space-dash-space-PUBLISHED` (matching existing entries like `## [1.10.1] - 2026-01-22 - PUBLISHED`), **not** `[PUBLISHED]` in brackets.
- Leave all content under the heading untouched.
- Do **not** create a new empty `## [Unreleased]` section — the next release cycle will re-create it.

### 4. Validate CHANGELOG entries match the work being released

Find the previous published version's commit SHA (the one before NEW_VERSION). Run `git log --oneline <prev>..HEAD`. Also check `git diff` for any uncommitted work staged/unstaged.

For every substantive commit or uncommitted change, verify the CHANGELOG section mentions it. If something significant is missing, **stop and ask the user** before finalizing — don't invent entries on their behalf.

For pure-internal changes (refactors, code-analysis docs, test artifacts) it's fine if they don't appear in the CHANGELOG, but **API surface changes, behavior changes, and bug fixes must be there**.

### 5. Commit

Stage `package.json`, `package-lock.json`, `CHANGELOG.md`. Match the existing commit-message style in this repo — short prose subject, no body, using the `v` prefix:

```
vNEW_VERSION - <one-line summary of the release's headline change>
```

Look at recent published-version commits (`git log --grep='^v[0-9]'`) for tone — they're terse, often just the version followed by a dash and 1–3 phrases summarizing the highlight (e.g. `v1.10.1 - new way to show messages inside the drp - new event bus architecture to solidify code - some examples reworked and polished`).

If the release is large enough that a body adds real value, write one — but err on the side of brevity. If the most recent few commits include a `Co-Authored-By` line, include one; otherwise don't add one.

### 6. Report

Report back with:
- The new version number
- The commit SHA
- Exactly what the user needs to run to publish: `npm publish` (no `cd` needed — single-package repo)
- A reminder that the CHANGELOG's `- PUBLISHED` tag is now in place. If the publish fails or is aborted, they should revert the commit (`git reset --hard HEAD~1`) before retrying.

## Things not to do

- **Do not run `npm publish`.** The user publishes manually.
- **Do not push to git remote.** The commit stays local until the user pushes.
- **Do not add a new empty `[Unreleased]` section** after finalizing — next cycle re-creates it.
- **Do not invent CHANGELOG entries** to cover commits you find; ask the user if something's missing.
- **Do not bump if there's nothing meaningful in `[Unreleased]`** — stop and explain.
- **Do not add a "What's New in vX.Y.Z" section to README.** This repo intentionally points to `CHANGELOG.md` from `README.md#Changelog` and avoids duplication.
- **Do not skip `npm install --package-lock-only`.** A stale `package-lock.json` after a version bump confuses downstream consumers.

## Edge cases

- **CHANGELOG already has `## [NEW_VERSION] - YYYY-MM-DD` heading without `- PUBLISHED`.** Someone (you, on a previous run; or the user manually) pre-rolled the heading. Just append ` - PUBLISHED` to the existing heading and skip step 3's rename. Verify the date is today; if not, ask whether to update it.
- **`package.json` already at `NEW_VERSION`.** Someone pre-bumped. Skip step 2's edit, but still re-run `npm install --package-lock-only` to make sure the lockfile is in sync.
- **`npm install --package-lock-only` errors with peer-dep warnings.** That's normal; warnings are fine. Stop only if there's an actual error.
