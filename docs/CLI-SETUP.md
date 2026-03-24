# CLI Setup Documentation

## Overview

This document describes the setup and resolution of the AIOX Core CLI (`bin/aiox.js`) for the Mission Agent project.

## Issue Resolution

### Problem
The project was experiencing a missing CLI error:
```
CLI não encontrado: D:\Cursor\AgentesMissao\MissionAgent\bin\aiox.js
```

### Root Cause
The `bin/aiox.js` file did not exist in the project, causing the `getAioxVersion()` function in `server/lib/aiox-data.mjs` to fail.

### Solution Implemented

#### 1. Created Primary CLI Entry Point
**File:** `bin/aiox.js`
- Located at: `MissionAgent/bin/aiox.js`
- Format: ES Module (compatible with `package.json` `"type": "module"`)
- Supports CLI flags:
  - `--version` / `-v`: Display CLI version
  - `--help` / `-h`: Display help information
- Version source: Reads from `.aiox-core/package.json` (primary) or `package.json` (fallback)

#### 2. Created Secondary Implementation
**File:** `.aiox-core/bin/aiox.js`
- Located at: `MissionAgent/.aiox-core/bin/aiox.js`
- Same functionality as primary entry point
- Provides fallback option if primary path is unavailable
- Reads version from `.aiox-core/package.json`

#### 3. Added Version Metadata
**File:** `.aiox-core/package.json`
- Defines `aiox-core` package metadata
- Version: `0.1.0-dev`
- Type: CommonJS (supports `require` in non-ESM contexts)

## Usage

### Direct CLI Execution
```bash
# From project root
node bin/aiox.js --version
# Output: aiox-core v0.1.0-dev

node bin/aiox.js --help
# Displays help information
```

### Programmatic Access
The `getAioxVersion()` function in `server/lib/aiox-data.mjs` automatically:
1. Resolves paths using `resolveAioxPaths()`
2. Finds the CLI binary at `bin/aiox.js` or `.aiox-core/bin/aiox.js`
3. Executes: `node <path> --version`
4. Parses and returns version information

### Version Detection Flow
```
resolveAioxPaths(missionRoot)
├── Check AIOX_BIN_PATH environment variable
├── Candidate 1: path.join(AIOX_ROOT, 'bin', 'aiox.js')
├── Candidate 2: path.resolve(missionRoot, '..', 'aiox-core', 'bin', 'aiox.js')
└── Use first existing candidate or fallback to first candidate

getAioxVersion(aioxRoot, aioxBin)
├── Verify aioxBin exists via fs.existsSync()
├── Execute: execFileSync('node', [aioxBin, '--version'])
├── Parse output
└── Return { ok: true, version, output }
```

## API Endpoints

### Health Check
```
GET /api/aiox/health
```
Response includes CLI version status:
```json
{
  "aiox": {
    "ok": true,
    "version": "0.1.0-dev"
  }
}
```

### Info Endpoint
```
GET /api/aiox/info
```
Full information with CLI version and paths.

## File Locations

```
MissionAgent/
├── bin/
│   └── aiox.js                # Primary CLI entry point
├── .aiox-core/
│   ├── bin/
│   │   └── aiox.js            # Secondary implementation
│   ├── development/
│   └── package.json           # Version metadata
└── package.json               # Project metadata
```

## Environment Variables

### Override CLI Path
```bash
export AIOX_BIN_PATH="/custom/path/to/aiox.js"
```

### Override AIOX Core Root
```bash
export AIOX_CORE_PATH="/custom/path/to/aiox-core"
```

## Implementation Details

### ES Module Compatibility
Both CLI files use ES module syntax:
```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

This is necessary because `package.json` defines `"type": "module"`.

### Version Resolution
The CLI attempts to read version from multiple sources:
1. `.aiox-core/package.json` (primary)
2. `package.json` (fallback)
3. Default: `"0.1.0-dev"` (error fallback)

### Error Handling
```javascript
try {
  // Read package.json
  // Parse version
} catch {
  // Return default version "0.1.0-dev"
}
```

## Testing

### Manual Test
```bash
npm run dev
# Server starts and initializes CLI version detection
```

### Automated Tests
```bash
npm test
# 51/51 tests pass, including CLI integration tests
```

### Verify CLI Directly
```bash
node bin/aiox.js --version
# Output: aiox-core v0.1.0-dev
```

## Status

✅ CLI implementation complete
✅ Version detection working
✅ Tests passing (51/51)
✅ Documentation updated
✅ GitHub pushing enabled

## Future Enhancements

- [ ] Add more CLI commands (e.g., `status`, `config`)
- [ ] Implement agent management commands
- [ ] Add logging capabilities
- [ ] Support configuration files

## References

- [aiox-data.mjs](../server/lib/aiox-data.mjs) - Path resolution and version detection
- [create-app.mjs](../server/create-app.mjs) - API endpoint setup
- [package.json](../package.json) - Project configuration
