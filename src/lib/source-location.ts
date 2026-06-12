import type { SourceLocation } from "./types"

/** Format a source location as "path/to/file.tsx:42" (line omitted when unknown) */
export function formatSourceLocation(source: SourceLocation): string {
  return source.line != null ? `${source.file}:${source.line}` : source.file
}
