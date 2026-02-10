@echo off
REM Convenience script to build and link claude-sync for development (Windows)

echo Building claude-sync...
call npm run build

echo Linking globally...
call npm link

echo ✓ Done! You can now run 'claude-sync' from anywhere.
echo   Try: claude-sync --help
