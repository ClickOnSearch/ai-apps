# Changelog

All notable changes to `@clickonsearch/agent-skills` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - Unreleased

Not yet published to npm.

### Added

- Initial release: a reusable, tool-agnostic "skills" system
  (`composeSystemPrompt`, `getSkill`, `SKILL_NAMES`) that any agent can
  layer onto its own base system prompt.
- `code-review` skill — reviews a diff or code change against a standard
  checklist (correctness, security, simplicity, test coverage) and reports
  concrete findings.
