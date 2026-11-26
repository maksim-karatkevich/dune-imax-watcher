import { readFile, writeFile } from "node:fs/promises";

/** Ids of showings already alerted on. `null` means no state yet (first run). */
export async function loadSeen(path: string): Promise<Set<string> | null> {
  try {
    const json = JSON.parse(await readFile(path, "utf8")) as { ids: string[] };
    return new Set(json.ids);
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") return null;
    throw e;
  }
}

/** Sorted + trailing newline, so an unchanged set produces a byte-identical file (no git commit). */
export async function saveSeen(path: string, ids: Set<string>): Promise<void> {
  await writeFile(path, JSON.stringify({ ids: [...ids].sort() }, null, 2) + "\n");
}
