# Changelog

All notable changes to claude-sync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Webhook integration for remote sync triggers
- Encryption for sensitive configuration values
- Profile support (multiple sync configurations)
- GUI/interactive configuration wizard

## [0.1.0] - 2024-01-15

### Added
- Initial release
- Git-based configuration synchronization
- Selective sync (skills, plugins, settings, projects, history)
- Push/pull/sync commands
- Status command with detailed information
- Configuration management commands
- Watch mode for automatic synchronization
- Backup management (create, list, restore, delete, clean)
- Conflict resolution strategies (ask, local, remote, newest)
- Dry-run mode for all sync operations
- Interactive initialization wizard
- Colorized output and progress indicators
- Automatic backups before destructive operations
- Exclude patterns for sensitive files

[Unreleased]: https://github.com/user/claude-sync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/claude-sync/releases/tag/v0.1.0
