# GitHub Automation DOX

## Purpose

Owns GitHub Actions workflows for installer and release automation.

## Ownership

- `workflows/release-installers.yml`: builds signed Windows and macOS installers and updater artifacts from version tags.

## Local Contracts

- Release tags use `v<package version>`.
- Windows release builds use the official NSIS installer target.
- macOS release builds use the official app identity with a DMG bundle config.
- Tagged releases use the stored Tauri signing secrets and publish `latest.json` plus signed artifacts for the official app updater.
- Dev-app builds never use the official updater endpoint.

## Verification

- Run `npm run check` before release commits.
- Confirm the GitHub release workflow finishes before sharing installer links.
