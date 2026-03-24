#!/usr/bin/env node

/**
 * AIOX Core CLI Entry Point
 * Mock version for mission-agent development environment
 * 
 * This file provides version information for the aiox-core toolkit
 * and serves as the entry point for AIOX CLI commands.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get version from package.json
async function getVersion() {
  try {
    const packagePath = path.resolve(__dirname, '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return pkg.version || '0.1.0-dev';
    }
    return '0.1.0-dev';
  } catch {
    return '0.1.0-dev';
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    const version = await getVersion();
    console.log(`aiox-core v${version}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AIOX Core CLI v0.1.0-dev
Usage: aiox [command] [options]

Commands:
  --version, -v    Show version
  --help, -h       Show this help message

For more information, visit: https://github.com/aiox-project/aiox-core
    `);
    process.exit(0);
  }

  // Default: show version
  const version = await getVersion();
  console.log(`aiox-core v${version}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
