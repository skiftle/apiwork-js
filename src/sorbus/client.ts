import type { GeneratorContext, ResolvedGenerateOptions } from '../codegen';
import type { Schema } from '../types';

import { resolveClientIdentifier, resolveEndpointIdentifier } from '../codegen';
import { camelCase, pascalCase } from '../utils';

export function buildClient(
  schema: Schema,
  resolvedOptions: ResolvedGenerateOptions,
  context: GeneratorContext,
): string {
  const lines: string[] = [];
  const extension = resolvedOptions.importExtension;
  const resources = schema.resources.map((resource) => ({
    camelIdentifier: camelCase(resource.identifier),
    pascalIdentifier: pascalCase(resource.identifier),
  }));

  const clientName = resolveClientIdentifier('Client', context);
  const createClientName = resolveClientIdentifier('createClient', context);
  const contractName = resolveClientIdentifier('contract', context);

  lines.push("import { createClientFactory } from 'sorbus';");
  lines.push('');

  const typeImports = resources
    .map((resource) =>
      resolveEndpointIdentifier(
        `${resource.pascalIdentifier}OperationTree`,
        context,
      ),
    )
    .join(', ');
  lines.push(`import type { ${typeImports} } from './endpoints${extension}';`);
  lines.push(`import { ${contractName} } from './contract${extension}';`);
  lines.push('');

  lines.push(`export interface ${clientName} {`);
  for (const resource of resources) {
    const operationTree = resolveEndpointIdentifier(
      `${resource.pascalIdentifier}OperationTree`,
      context,
    );
    lines.push(`  ${resource.camelIdentifier}: ${operationTree};`);
  }
  lines.push('}');
  lines.push('');

  lines.push(
    `export const ${createClientName} = createClientFactory<${clientName}>(${contractName});`,
  );
  lines.push('');

  return lines.join('\n');
}
