import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** @internal */
export async function writeFiles(
  outdir: string,
  files: Map<string, string>,
): Promise<void> {
  for (const [filename, content] of files) {
    const filepath = join(outdir, filename);
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, content);
  }
}
