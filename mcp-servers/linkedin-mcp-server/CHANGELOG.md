# Changelog

All notable changes to `@clickonsearch/linkedin-mcp-server` are documented
here. Each entry corresponds to the npm version it shipped in. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-09-19

### Added

- Initial release: an MCP server using LinkedIn's OAuth v2 API, exposing
  `get_profile` and `create_post` as MCP tools.

### Fixed

- Updated the default `LINKEDIN_API_VERSION` after the previous default
  fell outside LinkedIn's ~1-year rolling version window and started
  returning a `426 NONEXISTENT_VERSION` error; added explicit detection and
  a clearer error message for that specific failure.
