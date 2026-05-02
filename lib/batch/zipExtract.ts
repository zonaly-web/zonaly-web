import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";

/**
 * Extract a ZIP archive to a target directory.
 *
 * - If `targetDir` exists and `force=false`, no-op (idempotent cache).
 * - If `force=true`, the directory is wiped and re-extracted.
 * - Preserves the archive's relative paths.
 */
export async function extractZipToDir(
  zipPath: string,
  targetDir: string,
  options: { force?: boolean } = {},
): Promise<void> {
  if (existsSync(targetDir) && !options.force) return;
  if (existsSync(targetDir)) rmSync(targetDir, { recursive: true });
  mkdirSync(targetDir, { recursive: true });

  const directory = await unzipper.Open.file(zipPath);
  for (const entry of directory.files) {
    if (entry.type !== "File") continue;
    const out = path.join(targetDir, entry.path);
    mkdirSync(path.dirname(out), { recursive: true });
    await pipeline(entry.stream(), createWriteStream(out));
  }
}
