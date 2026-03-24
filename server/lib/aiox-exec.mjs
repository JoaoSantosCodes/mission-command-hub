/**
 * Execução controlada da CLI aiox (apenas subcomandos em whitelist).
 */
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const ALLOWED = new Set(['doctor', 'info']);
export const AIOX_EXEC_MAX_OUT = 200_000;

export function isAioxExecEnabled() {
  const v = process.env.ENABLE_AIOX_CLI_EXEC;
  return v === '1' || v === 'true';
}

export function getExecSecret() {
  return process.env.AIOX_EXEC_SECRET ?? '';
}

export function isAioxExecConfigured() {
  return isAioxExecEnabled() && getExecSecret().length >= 8;
}

function parseTimeoutMs() {
  const n = Number(process.env.AIOX_EXEC_TIMEOUT_MS || 120_000);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 600_000) : 120_000;
}

/**
 * @param {"doctor"|"info"} subcommand
 * @param {{ aioxRoot: string; aioxBin: string }} paths
 */
export async function runAioxSubcommand(subcommand, { aioxRoot, aioxBin }) {
  if (!ALLOWED.has(subcommand)) {
    return { ok: false, error: 'subcomando não permitido', exitCode: null };
  }
  if (!fs.existsSync(aioxBin)) {
    return { ok: false, error: `CLI não encontrada: ${aioxBin}`, exitCode: null };
  }
  const timeout = parseTimeoutMs();
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [aioxBin, subcommand], {
      cwd: aioxRoot,
      env: { ...process.env },
      timeout,
      maxBuffer: AIOX_EXEC_MAX_OUT + 64 * 1024,
      encoding: 'utf8',
    });
    return {
      ok: true,
      stdout: String(stdout ?? '').slice(0, AIOX_EXEC_MAX_OUT),
      stderr: String(stderr ?? '').slice(0, AIOX_EXEC_MAX_OUT),
      exitCode: 0,
      timedOut: false,
    };
  } catch (e) {
    const err =
      /** @type {NodeJS.ErrnoException & { stdout?: string; stderr?: string; status?: number; signal?: string }} */ (
        e
      );
    const stdout = String(err.stdout ?? '').slice(0, AIOX_EXEC_MAX_OUT);
    const stderr = String(err.stderr ?? err.message ?? '').slice(0, AIOX_EXEC_MAX_OUT);
    const timedOut = err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM';
    let exitCode = 1;
    if (typeof err.status === 'number') exitCode = err.status;
    else if (typeof err.code === 'number') exitCode = err.code;
    else if (timedOut) exitCode = 124;
    return {
      ok: exitCode === 0,
      stdout,
      stderr,
      exitCode,
      timedOut,
    };
  }
}
