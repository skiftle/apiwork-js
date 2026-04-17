import type { Schema } from './types';

import { writeFiles } from './codegen';
import { parse } from './parse';
import { generate as generateSorbus } from './sorbus/generate';
import { generate as generateTypescript } from './typescript/generate';
import { generate as generateZod } from './zod/generate';
import { parseArgs } from 'node:util';

type GenerateFn = (schema: Schema) => Map<string, string>;

const generators: Record<string, GenerateFn> = {
  sorbus: generateSorbus,
  typescript: generateTypescript,
  zod: generateZod,
};

export async function run(args: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      outdir: {
        short: 'o',
        type: 'string',
      },
    },
  });

  const [command, url] = positionals;

  if (!command || !url) {
    console.error('Usage: apiwork <generator> <url> --outdir <dir>');
    console.error('Generators: typescript, zod, sorbus');
    process.exit(1);
  }

  const generator = generators[command];

  if (!generator) {
    console.error(`Unknown generator: ${command}`);
    console.error(`Available: ${Object.keys(generators).join(', ')}`);
    process.exit(1);
  }

  const outdir = values.outdir ?? '.';

  const schema =
    url.startsWith('http://') || url.startsWith('https://')
      ? await parse.url(url)
      : await parse.file(url);

  const files = generator(schema);

  await writeFiles(outdir, files);

  for (const filename of files.keys()) {
    console.log(`  ${filename}`);
  }
}
