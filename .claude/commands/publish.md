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
- `README.md` — must have a `## What's New in vWIP_VERSION` section for the release being prepared

`README.md` keeps the **two most recent** `## What's New in vX.Y.Z` sections (the just-finalized one plus the previous one). Older What's New sections are pruned during publish. The `## Changelog` block at the bottom of the README still links to `CHANGELOG.md` for the full history.

## Steps (in order)

### 1. Sanity checks

- Run `git status`. If the working tree has uncommitted changes other than the files you're about to touch (`package.json`, `package-lock.json`, `CHANGELOG.md`, `README.md`), warn the user and ask before continuing. Small in-flight edits to those four are fine to roll into the release commit.
- Confirm `CHANGELOG.md` has an `## [Unreleased]` section with at least one bullet under it. If empty, stop — there's nothing meaningful to release.
- Confirm `README.md` has a `## What's New in vWIP_VERSION` section (where `WIP_VERSION` is whatever heading exists for the in-flight release — usually `vNEW_VERSION`, but sometimes the author wrote it speculatively under the previous patch number). If it's missing entirely, stop and ask the user to add one — the publish step shouldn't invent the highlights, that's a writing call, not a mechanical one.
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

### 4. Update README "What's New" sections

In `README.md`:

- If the existing `## What's New in vWIP_VERSION` section's version differs from `NEW_VERSION`, rename its heading to `## What's New in vNEW_VERSION`. No content rewrites — the text was already curated for this release.
- Then count the `## What's New in vX.Y.Z` headings. If there are more than **two**, delete the oldest ones so only the **two most recent** remain (the just-finalized one plus the one before it).

### 5. Validate README reflects the release

Read both the finalized CHANGELOG section and the matching `What's New in vNEW_VERSION` section. Every **Added** or **Changed** bullet in the CHANGELOG that represents a user-facing feature or behavior change should have a corresponding hit in the What's New section (paraphrased, not verbatim). Pure internal refactors and Fixed-only entries don't need coverage.

If you find a significant CHANGELOG entry that isn't reflected in What's New, add a bullet for it. If the section ends up with more than ~8 bullets after this pass, condense — What's New should be scannable, not exhaustive.

### 6. Validate CHANGELOG entries match the work being released

Find the previous published version's commit SHA (the one before NEW_VERSION). Run `git log --oneline <prev>..HEAD`. Also check `git diff` for any uncommitted work staged/unstaged.

For every substantive commit or uncommitted change, verify the CHANGELOG section mentions it. If something significant is missing, **stop and ask the user** before finalizing — don't invent entries on their behalf.

For pure-internal changes (refactors, code-analysis docs, test artifacts) it's fine if they don't appear in the CHANGELOG, but **API surface changes, behavior changes, and bug fixes must be there**.

### 7. Commit

Stage `package.json`, `package-lock.json`, `CHANGELOG.md`, and `README.md`. Match the existing commit-message style in this repo — short prose subject, no body, using the `v` prefix:

```
vNEW_VERSION - <one-line summary of the release's headline change>
```

Look at recent published-version commits (`git log --grep='^v[0-9]'`) for tone — they're terse, often just the version followed by a dash and 1–3 phrases summarizing the highlight (e.g. `v1.10.1 - new way to show messages inside the drp - new event bus architecture to solidify code - some examples reworked and polished`).

If the release is large enough that a body adds real value, write one — but err on the side of brevity. If the most recent few commits include a `Co-Authored-By` line, include one; otherwise don't add one.

### 8. Report

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
- **Do not invent What's New content** during the publish step — the section should already exist with curated bullets by the time publish runs. If it's missing or stale, stop and ask the author to write the highlights.
- **Do not let What's New grow past two sections.** The pattern is "current release + previous release"; older sections live in `CHANGELOG.md` only.
- **Do not skip `npm install --package-lock-only`.** A stale `package-lock.json` after a version bump confuses downstream consumers.

## Edge cases

- **CHANGELOG already has `## [NEW_VERSION] - YYYY-MM-DD` heading without `- PUBLISHED`.** Someone (you, on a previous run; or the user manually) pre-rolled the heading. Just append ` - PUBLISHED` to the existing heading and skip step 3's rename. Verify the date is today; if not, ask whether to update it.
- **`package.json` already at `NEW_VERSION`.** Someone pre-bumped. Skip step 2's edit, but still re-run `npm install --package-lock-only` to make sure the lockfile is in sync.
- **`npm install --package-lock-only` errors with peer-dep warnings.** That's normal; warnings are fine. Stop only if there's an actual error.
