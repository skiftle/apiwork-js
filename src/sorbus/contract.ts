import type { GeneratorContext, ResolvedGenerateOptions } from '../codegen';
import type { Schema } from '../types';

import {
  resolveClientIdentifier,
  resolveDomainIdentifier,
  resolveEndpointIdentifier,
} from '../codegen';
import { camelCase } from '../utils';

/** @internal */
export function buildContract(
  schema: Schema,
  resolvedOptions: ResolvedGenerateOptions,
  context: GeneratorContext,
): string {
  const lines: string[] = [];
  const extension = resolvedOptions.importExtension;
  const hasError = schema.types.some((type) => type.name === 'error');
  const resources = schema.resources.map((resource) => ({
    camelIdentifier: camelCase(resource.identifier),
    identifier: resource.identifier,
  }));

  const contractName = resolveClientIdentifier('contract', context);

  const schemaImports: string[] = [];
  if (hasError) {
    const errorSchemaName = `${resolveDomainIdentifier('error', context)}Schema`;
    schemaImports.push(errorSchemaName);
  }

  if (schemaImports.length > 0) {
    lines.push(
      `import { ${schemaImports.join(', ')} } from './api${extension}';`,
    );
  }

  const valueImports = resources
    .map((resource) =>
      resolveEndpointIdentifier(resource.camelIdentifier, context),
    )
    .join(', ');
  lines.push(`import { ${valueImports} } from './endpoints${extension}';`);
  lines.push('');

  lines.push(`export const ${contractName} = {`);
  lines.push('  endpoints: {');
  for (const resource of resources) {
    const name = resolveEndpointIdentifier(resource.camelIdentifier, context);
    lines.push(`    ${name},`);
  }
  lines.push('  },');
  if (hasError) {
    const errorSchemaName = `${resolveDomainIdentifier('error', context)}Schema`;
    lines.push(`  error: ${errorSchemaName},`);
  }
  lines.push('} as const;');
  lines.push('');

  return lines.join('\n');
}
