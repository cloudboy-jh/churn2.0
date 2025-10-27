# Installing Bun on Windows

## Quick Install (PowerShell)

Open PowerShell and run:

```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

This will:
1. Download the latest Bun binary
2. Install it to `~/.bun/bin/bun.exe`
3. Add Bun to your PATH

## After Installation

**Restart your terminal** (close and reopen PowerShell), then verify:

```powershell
bun --version
```

You should see something like `1.1.34` or similar.

## Alternative: Install via npm (if you have Node.js)

```powershell
npm install -g bun
```

## Alternative: Manual Installation

1. Download from https://bun.sh/
2. Extract to a folder (e.g., `C:\bun`)
3. Add to PATH:
   - Search "Environment Variables" in Windows
   - Edit "Path" under User variables
   - Add `C:\bun\bin`
   - Restart terminal

## Troubleshooting

### "bun: command not found" after install

**Restart your terminal completely** - the PATH won't update in the current session.

### PowerShell execution policy error

Run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### WSL Alternative

If you're using WSL (Windows Subsystem for Linux):

```bash
curl -fsSL https://bun.sh/install | bash
```

## Verify Installation

After installing and restarting your terminal:

```powershell
cd C:\Users\johns\OneDrive\Desktop\churn2.0
bun --version
bun install
```

## Once Bun is Installed

```powershell
# Install dependencies
bun install

# Run in dev mode
bun run dev

# Build
bun run build

# Compile to single binary
bun run compile
```

## Why Bun?

- **Fast**: 20-30x faster than npm
- **Built-in TypeScript**: No need for ts-node
- **Single Binary**: Easy compilation with `--compile`
- **Compatible**: Drop-in replacement for npm/node

## Need Help?

- Bun documentation: https://bun.sh/docs
- Bun Discord: https://bun.sh/discord
