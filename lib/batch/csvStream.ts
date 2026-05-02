import { createGunzip } from "node:zlib";
import type { Readable } from "node:stream";
import { parse } from "csv-parse";

export type CsvStreamOptions = {
  delimiter?: string;
  /** Force gunzip on the input stream. Default: auto-detect from filePath if provided. */
  gzip?: boolean;
  /** Trim whitespace around fields. Default true. */
  trim?: boolean;
  /** Quote character. Default `"`. Pass `false` to disable quote handling. */
  quote?: string | false;
};

/**
 * Async iterator over CSV rows parsed as plain string records keyed by header name.
 * Decompresses gzip on the fly when `gzip: true`.
 */
export async function* iterateCsvRows(
  source: Readable,
  options: CsvStreamOptions = {},
): AsyncIterable<Record<string, string>> {
  const parser = parse({
    columns: true,
    bom: true,
    delimiter: options.delimiter ?? ";",
    trim: options.trim ?? true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    quote: options.quote === undefined ? '"' : options.quote === false ? false : options.quote,
  });

  const decompressed = options.gzip ? source.pipe(createGunzip()) : source;
  decompressed.on("error", (err) => parser.destroy(err));
  decompressed.pipe(parser);

  for await (const record of parser) {
    yield record as Record<string, string>;
  }
}
