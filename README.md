# claude-config-sync

> Synchronize Claude Code configuration across multiple terminal environments

## Problem

When using Claude Code on multiple machines or terminals, keeping your configuration synchronized is a manual process. You need to reinstall skills and copy settings on each machine, which is time-consuming and error-prone.

## Solution

`claude-config-sync` uses Git to version control and synchronize your Claude Code configuration across all your environments. Push your configuration to a private repository, pull it on any machine, and never set up twice.

## Features

- **Git-based synchronization** - Use your existing Git workflow
- **Selective sync** - Choose what to sync (skills, plugins, settings, etc.)
- **Conflict resolution** - Interactive or automatic conflict handling
- **Auto-sync** - Watch mode for automatic synchronization
- **Backups** - Automatic backups before any destructive operation
- **Secure** - Exclude sensitive files by default

## Installation

```bash
npm install -g claude-config-sync
```

Or build from source:

```bash
git clone https://github.com/user/claude-config-sync
cd claude-config-sync
npm install
npm run build
npm link
```

## Quick Start

```bash
# Initialize sync
claude-config-sync init

# Push your configuration
claude-config-sync push

# On another machine, pull configuration
claude-config-sync pull

# Check status
claude-config-sync status
```

## Configuration

Configuration is stored in `~/.claude-config-sync/config.json`:

```json
{
  "sync": {
    "repository": "git@github.com:user/claude-config.git",
    "branch": "main",
    "autoSync": false,
    "syncIntervalMinutes": 30,
    "include": {
      "skills": true,
      "plugins": true,
      "settings": true,
      "projects": false,
      "history": false,
      "customPatterns": []
    },
    "excludePatterns": [".env", "*.key", "secrets/", "*.secret"],
    "conflictStrategy": "ask"
  }
}
```

## Commands

### Initialization

```bash
claude-config-sync init [--repo <url>] [--branch <name>]
```

Initialize sync configuration. If no repository URL is provided, you'll be guided through interactive setup.

### Push

```bash
claude-config-sync push [--dry-run] [--force]
```

Push local configuration changes to the remote repository.

### Pull

```bash
claude-config-sync pull [--dry-run] [--force]
```

Pull configuration changes from the remote repository.

### Sync

```bash
claude-config-sync sync [--dry-run]
```

Perform bidirectional synchronization (pull then push).

### Status

```bash
claude-config-sync status [--verbose]
```

Show current synchronization status including:
- Repository information
- Uncommitted changes
- Conflicts
- Recent commits
- Available backups

### Config

```bash
claude-config-sync config list                    # List all configuration
claude-config-sync config get <path>              # Get specific value
claude-config-sync config set <path> <value>      # Set a value
claude-config-sync config exclude <pattern>       # Add exclude pattern
claude-config-sync config include <pattern>       # Remove exclude pattern
claude-config-sync config edit                    # Interactive config editor
```

### Watch

```bash
claude-config-sync watch start [--delay <ms>]     # Start watching for changes
claude-config-sync watch stop                     # Stop watching
claude-config-sync watch status                   # Show watcher status
```

Monitor files for changes and automatically sync. Uses chokidar for efficient file watching with debouncing.

### Backup

```bash
claude-config-sync backup create                  # Create a backup
claude-config-sync backup list [--verbose]        # List backups
claude-config-sync backup restore <backup>        # Restore from backup
claude-config-sync backup delete <backup>         # Delete a backup
claude-config-sync backup clean [--keep <n>]      # Remove old backups
```

## What Gets Synchronized

By default, `claude-config-sync` synchronizes:

- **skills/** - Installed skills
- **plugins/** - Plugin configurations
- **settings.json** - Claude Code settings

Optionally, you can also sync:
- **projects/** - Project configurations
- **history/** - Command history
- **Custom patterns** - Any files matching custom glob patterns

## Security

`claude-config-sync` excludes sensitive files by default:

- `.env` files
- `*.key` files
- `secrets/` directories
- `*.secret` files

You can add more exclusions:

```bash
claude-config-sync config exclude "*.pem"
claude-config-sync config exclude "credentials/**"
```

## Conflict Resolution

When conflicts occur (same file modified locally and remotely), you can choose:

- **ask** - Interactive prompt for each conflict (default)
- **local** - Always keep local version
- **remote** - Always keep remote version
- **newest** - Use file with newest modification time

Configure via:

```bash
claude-config-sync config set sync.conflictStrategy newest
```

## Directory Structure

```
~/.claude/           # Claude Code configuration
├── skills/
├── plugins/
├── settings.json
└── ...

~/.claude-config-sync/      # claude-config-sync data
├── config.json      # Sync configuration
├── repo/            # Git repository clone
└── backups/         # Configuration backups
    ├── backup-2024-01-01T12:00:00.000Z/
    └── ...
```

## Examples

### Initial Setup

```bash
$ claude-config-sync init
? Git repository URL: git@github.com:user/claude-config.git
? Branch: main
? What do you want to sync?
  ✓ skills
  ✓ plugins
  ✓ settings
  ○ projects
? Conflict resolution strategy: Ask (interactive)
✓ Configuration saved
✓ Repository initialized
? Push current configuration now? Yes
✓ Pushed 15 files
```

### Daily Workflow

```bash
# Before starting work, pull latest changes
$ claude-config-sync pull
✓ Pulled 3 files

# After installing new skills, push changes
$ claude-config-sync push
✓ Pushed 2 files

# Check status
$ claude-config-sync status
Repository: git@github.com:user/claude-config.git
Branch: main
Status: Up to date with remote
Synced Items:
  • Skills
  • Plugins
  • Settings
```

### Auto-sync Mode

```bash
# Start watching for changes
$ claude-config-sync watch start
Starting file watcher...
Watching: /home/user/.claude
Debounce delay: 5000ms
✓ Watcher ready - waiting for changes...

# Any changes to skills/settings will auto-sync after 5 seconds
# Press Ctrl+C to stop
```

## Troubleshooting

### "Not initialized" error

Run `claude-config-sync init` to set up synchronization.

### Git authentication errors

Ensure your SSH keys are set up or use HTTPS URL with credentials:

```bash
claude-config-sync config set sync.repository https://user:token@github.com/user/repo.git
```

### Merge conflicts

If conflicts occur, they'll be resolved based on your `conflictStrategy` setting. Use `ask` mode for interactive resolution.

### Restore from backup

```bash
$ claude-config-sync backup list
[1] backup-2024-01-15T10:30:00.000Z
  • Date: 2024-01-15 10:30:00
  • Files: 42

$ claude-config-sync backup restore 1
✓ Backup restored successfully
```

## Development

```bash
# Clone repository
git clone https://github.com/user/claude-config-sync
cd claude-config-sync

# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Run tests
npm test

# Link for local testing
npm link
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built with [simple-git](https://github.com/stevelukin/simple-git)
- File watching via [chokidar](https://github.com/paulmillr/chokidar)
- CLI framework by [commander.js](https://github.com/tj/commander.js)

## Support

- Issues: https://github.com/user/claude-config-sync/issues
- Discussions: https://github.com/user/claude-config-sync/discussions

---

Made with ❤️ for the Claude Code community
