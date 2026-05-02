import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import type { Logger } from "./logger";

export type DownloadOptions = {
  url: string;
  cacheDir: string;
  noCache: boolean;
  logger: Logger;
  /** Optional override of the cache filename — e.g. "filosofi.csv". If omitted, sha256(url) + extension inferred from URL. */
  filename?: string;
};

function inferExtension(url: string): string {
  const clean = url.split("?")[0];
  const m = clean.match(/\.(csv\.gz|tar\.gz|csv|gz|zip|json|xml)$/i);
  return m ? `.${m[1].toLowerCase()}` : ".bin";
}

function cacheFilename(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `${hash}${inferExtension(url)}`;
}

/**
 * Download a remote file to disk-backed cache. Returns absolute path of the cached file.
 * Streams body to disk to avoid loading large files into memory.
 */
export async function downloadToCache(opts: DownloadOptions): Promise<string> {
  mkdirSync(opts.cacheDir, { recursive: true });
  const filename = opts.filename ?? cacheFilename(opts.url);
  const target = path.join(opts.cacheDir, filename);

  if (!opts.noCache && existsSync(target)) {
    const size = statSync(target).size;
    opts.logger.info("download cache hit", { url: opts.url, path: target, bytes: size });
    return target;
  }

  opts.logger.info("download started", { url: opts.url, cached: false, target: filename });
  const startedAt = Date.now();

  const res = await fetch(opts.url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`download_${res.status}: ${opts.url}`);
  }
  if (!res.body) {
    throw new Error(`download_no_body: ${opts.url}`);
  }

  const tmp = `${target}.partial`;
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
  // Atomic move
  const { renameSync } = await import("node:fs");
  renameSync(tmp, target);

  const bytes = statSync(target).size;
  opts.logger.info("download done", {
    url: opts.url,
    bytes,
    elapsed_ms: Date.now() - startedAt,
  });
  return target;
}

export function openCacheReadStream(filePath: string): Readable {
  return createReadStream(filePath);
}
