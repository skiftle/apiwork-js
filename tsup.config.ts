import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: [
    'src/index.ts',
    'src/sorbus/index.ts',
    'src/typescript/index.ts',
    'src/zod/index.ts',
    'src/bin/apiwork.ts',
  ],
  format: ['esm'],
});
