# GitHub Automation DOX

## Purpose

Owns GitHub Actions workflows for installer and release automation.

## Ownership

- `workflows/release-installers.yml`: builds Windows and macOS release installers from version tags.

## Local Contracts

- Release tags use `v<package version>`.
- Windows release builds use the official NSIS installer target.
- macOS release builds use the official app identity with a DMG bundle config.

## Verification

- Run `npm run check` before release commits.
- Confirm the GitHub release workflow finishes before sharing installer links.
