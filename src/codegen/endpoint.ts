import type { Action, Param, Resource, Schema } from '../types';
import type { GeneratorContext, ResolvedGenerateOptions } from './options';

import { isOptionalField, mapParamToType } from '../typescript/mapper';
import { camelCase, pascalCase } from '../utils';
import { mapParamToZod } from '../zod/mapper';
import {
  formatFileName,
  resolveDomainIdentifier,
  resolveEndpointIdentifier,
} from './options';
import { collectParamReferences } from './references';

/** @internal */
export interface EndpointOptions {
  endpoints: boolean;
  reexportChildren: boolean;
  zod: boolean;
}

interface ActionFile {
  childResources: string[];
  depth: number;
  endpointLines: string[];
  filename: string;
  interfaceLines: string[];
  references: Set<string>;
  resourceName: string;
  schemaLines: string[];
  typeLines: string[];
}

/** @internal */
export function buildEndpoints(
  schema: Schema,
  scopeIndex: Map<string, string | null>,
  options: EndpointOptions,
  resolvedOptions: ResolvedGenerateOptions,
): Map<string, string> {
  const files = new Map<string, string>();
  const actionFiles: ActionFile[] = [];
  const context: GeneratorContext = { options: resolvedOptions, scopeIndex };

  traverseResources(schema.resources, [], actionFiles, options, context);

  for (const actionFile of actionFiles) {
    const content = buildActionFileContent(actionFile, options, context);
    files.set(actionFile.filename, content);
  }

  if (actionFiles.length > 0) {
    buildBarrelExports(actionFiles, files, resolvedOptions);
  }

  return files;
}

function buildActionFileContent(
  actionFile: ActionFile,
  options: EndpointOptions,
  context: GeneratorContext,
): string {
  const parts: string[] = [];

  if (options.endpoints) {
    parts.push("import type { Operation } from 'sorbus';");
    parts.push("import * as z from 'zod';");
  } else if (options.zod) {
    parts.push("import * as z from 'zod';");
  }

  const contractImports = buildContractImports(
    actionFile.references,
    actionFile.depth,
    options,
    context,
  );
  if (contractImports) {
    if (parts.length > 0) {
      parts.push('');
    }
    parts.push(contractImports);
  }

  if (options.reexportChildren) {
    const extension = context.options.importExtension;
    const resourceFileName = formatFileName(
      actionFile.resourceName,
      context.options.fileCase,
    );
    for (const child of actionFile.childResources) {
      const childFileName = formatFileName(child, context.options.fileCase);
      const childOperationTree = resolveEndpointIdentifier(
        `${pascalCase(child)}OperationTree`,
        context,
      );
      const childConstName = resolveEndpointIdentifier(
        camelCase(child),
        context,
      );
      parts.push('');
      parts.push(
        `import type { ${childOperationTree} } from './${resourceFileName}/${childFileName}${extension}';`,
      );
      parts.push(
        `import { ${childConstName} } from './${resourceFileName}/${childFileName}${extension}';`,
      );
    }
  }

  if (actionFile.schemaLines.length > 0) {
    parts.push('');
    parts.push(actionFile.schemaLines.join('\n\n'));
  }

  if (actionFile.typeLines.length > 0) {
    parts.push('');
    parts.push(actionFile.typeLines.join('\n\n'));
  }

  if (options.endpoints) {
    parts.push('');
    const members: string[] = [];

    for (const line of actionFile.endpointLines) {
      members.push(line);
    }

    for (const child of actionFile.childResources) {
      const childConstName = resolveEndpointIdentifier(
        camelCase(child),
        context,
      );
      members.push(`  ${childConstName},`);
    }

    const resourceConstName = resolveEndpointIdentifier(
      camelCase(actionFile.resourceName),
      context,
    );
    parts.push(`export const ${resourceConstName} = {`);
    parts.push(members.join('\n'));
    parts.push('} as const;');

    parts.push('');
    const interfaceMembers: string[] = [];

    for (const line of actionFile.interfaceLines) {
      interfaceMembers.push(line);
    }

    for (const child of actionFile.childResources) {
      const childMemberName = camelCase(child);
      const childOperationTree = resolveEndpointIdentifier(
        `${pascalCase(child)}OperationTree`,
        context,
      );
      interfaceMembers.push(`  ${childMemberName}: ${childOperationTree};`);
    }

    const operationTreeName = resolveEndpointIdentifier(
      `${pascalCase(actionFile.resourceName)}OperationTree`,
      context,
    );
    parts.push(`export interface ${operationTreeName} {`);
    parts.push(interfaceMembers.join('\n'));
    parts.push('}');
  }

  return `${parts.join('\n')}\n`;
}

function traverseResources(
  resources: Resource[],
  parentIdentifiers: string[],
  actionFiles: ActionFile[],
  options: EndpointOptions,
  context: GeneratorContext,
): void {
  for (const resource of resources) {
    const schemaLines: string[] = [];
    const typeLines: string[] = [];
    const endpointLines: string[] = [];
    const interfaceLines: string[] = [];
    const references = new Set<string>();
    const childResources: string[] = [];

    for (const action of resource.actions) {
      generateActionContent(
        action,
        parentIdentifiers,
        resource.identifier,
        schemaLines,
        typeLines,
        endpointLines,
        interfaceLines,
        references,
        options,
        context,
      );
    }

    if (options.reexportChildren) {
      for (const childResource of resource.resources) {
        childResources.push(childResource.identifier);
      }
    }

    if (
      schemaLines.length > 0 ||
      typeLines.length > 0 ||
      childResources.length > 0
    ) {
      const directoryPath = parentIdentifiers
        .map((identifier) =>
          formatFileName(identifier, context.options.fileCase),
        )
        .join('/');
      const fileName = formatFileName(
        resource.identifier,
        context.options.fileCase,
      );
      const filename = directoryPath
        ? `endpoints/${directoryPath}/${fileName}.ts`
        : `endpoints/${fileName}.ts`;
      const depth = filename.split('/').length - 1;
      actionFiles.push({
        childResources,
        depth,
        endpointLines,
        filename,
        interfaceLines,
        references,
        resourceName: resource.identifier,
        schemaLines,
        typeLines,
      });
    }

    if (resource.resources.length > 0) {
      traverseResources(
        resource.resources,
        [...parentIdentifiers, resource.identifier],
        actionFiles,
        options,
        context,
      );
    }
  }
}

interface ActionParts {
  actionName: string;
  errorCodes: number[];
  method: string;
  path: string;
  pathParams: string[];
  requestBody: Param[];
  requestQuery: Param[];
  responseBody: Param | null;
  typeName: string;
}

function analyzeAction(
  action: Action,
  parentIdentifiers: string[],
  resourceIdentifier: string,
  context: GeneratorContext,
): ActionParts {
  const segments = action.name.split('.');
  const actionName = segments[segments.length - 1];
  const responseBody =
    action.response.body && !action.response.noContent
      ? action.response.body
      : null;

  const typeName = resolveEndpointIdentifier(
    pascalCase(
      [...parentIdentifiers, resourceIdentifier, actionName].join('_'),
    ),
    context,
  );

  return {
    actionName,
    errorCodes: action.raises
      .map((code) => resolveErrorStatus(code))
      .filter((status): status is number => status !== null)
      .sort((a, b) => a - b),
    method: action.method.toUpperCase(),
    path: action.path,
    pathParams: extractPathParams(action.path),
    requestBody: action.request.body,
    requestQuery: action.request.query,
    responseBody,
    typeName,
  };
}

function generateActionContent(
  action: Action,
  parentIdentifiers: string[],
  resourceIdentifier: string,
  schemaLines: string[],
  typeLines: string[],
  endpointLines: string[],
  interfaceLines: string[],
  references: Set<string>,
  options: EndpointOptions,
  context: GeneratorContext,
): void {
  const parts = analyzeAction(
    action,
    parentIdentifiers,
    resourceIdentifier,
    context,
  );

  generateActionTypes(parts, typeLines, references, context);

  if (options.zod) {
    generateActionSchemas(parts, schemaLines, references, context);
  }

  if (options.endpoints) {
    endpointLines.push(generateRuntimeEndpoint(parts));
    interfaceLines.push(generateOperationMember(parts));
  }
}

function generateActionTypes(
  parts: ActionParts,
  lines: string[],
  references: Set<string>,
  context: GeneratorContext,
): void {
  const { typeName } = parts;

  lines.push(`export type ${typeName}Method = '${parts.method}';`);
  lines.push(`export type ${typeName}Path = '${parts.path}';`);

  if (parts.pathParams.length > 0) {
    const fields = parts.pathParams
      .map((param) => `${camelCase(param)}: string`)
      .join('; ');
    lines.push(`export interface ${typeName}PathParams { ${fields} }`);
  }

  if (parts.requestQuery.length > 0) {
    lines.push(
      generateRequestQueryType(
        typeName,
        parts.requestQuery,
        references,
        context,
      ),
    );
  }

  if (parts.requestBody.length > 0) {
    lines.push(
      generateRequestBodyType(typeName, parts.requestBody, references, context),
    );
  }

  if (parts.responseBody) {
    lines.push(
      generateResponseBodyType(
        typeName,
        parts.responseBody,
        references,
        context,
      ),
    );
  }

  if (parts.requestQuery.length > 0 || parts.requestBody.length > 0) {
    const requestFields: string[] = [];
    if (parts.requestBody.length > 0) {
      requestFields.push(`body: ${typeName}RequestBody`);
    }
    if (parts.requestQuery.length > 0) {
      requestFields.push(`query: ${typeName}RequestQuery`);
    }
    lines.push(
      `export interface ${typeName}Request { ${requestFields.join('; ')} }`,
    );
  }

  if (parts.responseBody) {
    lines.push(
      `export interface ${typeName}Response { body: ${typeName}ResponseBody }`,
    );
  }

  if (parts.errorCodes.length > 0) {
    lines.push(
      `export type ${typeName}Errors = ${parts.errorCodes.join(' | ')};`,
    );
  }

  lines.push(generateDefinitionType(parts));
}

function generateDefinitionType(parts: ActionParts): string {
  const { typeName } = parts;
  const fields: string[] = [];

  fields.push(`method: ${typeName}Method`);
  fields.push(`path: ${typeName}Path`);

  if (parts.pathParams.length > 0) {
    fields.push(`pathParams: ${typeName}PathParams`);
  }
  if (parts.requestQuery.length > 0 || parts.requestBody.length > 0) {
    fields.push(`request: ${typeName}Request`);
  }
  if (parts.responseBody) {
    fields.push(`response: ${typeName}Response`);
  }
  if (parts.errorCodes.length > 0) {
    fields.push(`errors: ${typeName}Errors`);
  }

  return `export interface ${typeName} { ${fields.join('; ')} }`;
}

function generateActionSchemas(
  parts: ActionParts,
  lines: string[],
  references: Set<string>,
  context: GeneratorContext,
): void {
  const { typeName } = parts;

  if (parts.pathParams.length > 0) {
    const fields = parts.pathParams
      .map((param) => `${camelCase(param)}: z.string()`)
      .join(', ');
    lines.push(
      `export const ${typeName}PathParamsSchema = z.object({ ${fields} });`,
    );
  }

  if (parts.requestQuery.length > 0) {
    lines.push(
      generateRequestQuerySchema(
        typeName,
        parts.requestQuery,
        references,
        context,
      ),
    );
  }

  if (parts.requestBody.length > 0) {
    lines.push(
      generateRequestBodySchema(
        typeName,
        parts.requestBody,
        references,
        context,
      ),
    );
  }

  if (parts.responseBody) {
    lines.push(
      generateResponseBodySchema(
        typeName,
        parts.responseBody,
        references,
        context,
      ),
    );
  }
}

function generateRuntimeEndpoint(parts: ActionParts): string {
  const { actionName, typeName } = parts;
  const lines: string[] = [];

  lines.push(`  ${camelCase(actionName)}: {`);
  lines.push(`    method: '${parts.method}',`);
  lines.push(`    path: '${parts.path}',`);

  if (parts.pathParams.length > 0) {
    lines.push(`    pathParams: ${typeName}PathParamsSchema,`);
  }

  if (parts.requestQuery.length > 0 || parts.requestBody.length > 0) {
    lines.push('    request: {');
    if (parts.requestQuery.length > 0) {
      lines.push(`      query: ${typeName}RequestQuerySchema,`);
    }
    if (parts.requestBody.length > 0) {
      lines.push(`      body: ${typeName}RequestBodySchema,`);
    }
    lines.push('    },');
  }

  if (parts.responseBody) {
    lines.push('    response: {');
    lines.push(`      body: ${typeName}ResponseBodySchema,`);
    lines.push('    },');
  }

  if (parts.errorCodes.length > 0) {
    lines.push(`    errors: [${parts.errorCodes.join(', ')}],`);
  }

  lines.push('  },');

  return lines.join('\n');
}

function generateOperationMember(parts: ActionParts): string {
  return `  ${camelCase(parts.actionName)}: Operation<${parts.typeName}>;`;
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/:(\w+)/g);
  if (!matches) {
    return [];
  }
  return matches.map((match) => match.slice(1));
}

const ERROR_STATUS_MAP: Record<string, number> = {
  bad_request: 400,
  conflict: 409,
  forbidden: 403,
  internal_server_error: 500,
  not_found: 404,
  unauthorized: 401,
  unprocessable_entity: 422,
};

function resolveErrorStatus(code: string): number | null {
  return ERROR_STATUS_MAP[code] ?? null;
}

function generateRequestQuerySchema(
  typeName: string,
  params: Param[],
  references: Set<string>,
  context: GeneratorContext,
): string {
  const fields = params
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((param) => {
      collectParamReferences(param, references);
      return `  ${param.name}: ${mapParamToZod(param, context)},`;
    })
    .join('\n');

  return `export const ${typeName}RequestQuerySchema = z.object({\n${fields}\n});`;
}

function generateRequestBodySchema(
  typeName: string,
  params: Param[],
  references: Set<string>,
  context: GeneratorContext,
): string {
  const fields = params
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((param) => {
      collectParamReferences(param, references);
      return `  ${param.name}: ${mapParamToZod(param, context)},`;
    })
    .join('\n');

  return `export const ${typeName}RequestBodySchema = z.object({\n${fields}\n});`;
}

function generateResponseBodySchema(
  typeName: string,
  body: Param,
  references: Set<string>,
  context: GeneratorContext,
): string {
  collectParamReferences(body, references);
  return `export const ${typeName}ResponseBodySchema = ${mapParamToZod(body, context)};`;
}

function generateRequestQueryType(
  typeName: string,
  params: Param[],
  references: Set<string>,
  context: GeneratorContext,
): string {
  const fields = params
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((param) => {
      collectParamReferences(param, references);
      const optional = isOptionalField(param) ? '?' : '';
      return `  ${param.name}${optional}: ${mapParamToType(param, context)};`;
    })
    .join('\n');

  return `export interface ${typeName}RequestQuery {\n${fields}\n}`;
}

function generateRequestBodyType(
  typeName: string,
  params: Param[],
  references: Set<string>,
  context: GeneratorContext,
): string {
  const fields = params
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((param) => {
      collectParamReferences(param, references);
      const optional = isOptionalField(param) ? '?' : '';
      return `  ${param.name}${optional}: ${mapParamToType(param, context)};`;
    })
    .join('\n');

  return `export interface ${typeName}RequestBody {\n${fields}\n}`;
}

function generateResponseBodyType(
  typeName: string,
  body: Param,
  references: Set<string>,
  context: GeneratorContext,
): string {
  collectParamReferences(body, references);
  return `export type ${typeName}ResponseBody = ${mapParamToType(body, context)};`;
}

function buildContractImports(
  references: Set<string>,
  depth: number,
  options: EndpointOptions,
  context: GeneratorContext,
): string {
  const importsByFile = new Map<
    string,
    { schemas: string[]; types: string[] }
  >();
  const prefix = '../'.repeat(depth);
  const extension = context.options.importExtension;

  for (const reference of references) {
    const scope = context.scopeIndex.get(reference);
    if (scope === undefined) {
      continue;
    }

    const filename =
      scope === null
        ? `${prefix}api${extension}`
        : `${prefix}domains/${formatFileName(scope, context.options.fileCase)}${extension}`;

    let entry = importsByFile.get(filename);
    if (!entry) {
      entry = { schemas: [], types: [] };
      importsByFile.set(filename, entry);
    }

    const name = resolveDomainIdentifier(reference, context);
    if (options.zod) {
      entry.schemas.push(`${name}Schema`);
    }
    entry.types.push(name);
  }

  const lines: string[] = [];

  for (const [filename, entry] of [...importsByFile.entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    if (options.zod) {
      lines.push(
        `import type { ${entry.types.sort().join(', ')} } from '${filename}';`,
      );
      lines.push(
        `import { ${entry.schemas.sort().join(', ')} } from '${filename}';`,
      );
    } else {
      lines.push(
        `import type { ${entry.types.sort().join(', ')} } from '${filename}';`,
      );
    }
  }

  return lines.join('\n');
}

function buildBarrelExports(
  actionFiles: ActionFile[],
  files: Map<string, string>,
  resolvedOptions: ResolvedGenerateOptions,
): void {
  const directories = new Map<string, Set<string>>();

  for (const actionFile of actionFiles) {
    const parts = actionFile.filename.split('/');
    const filename = parts.pop();
    if (!filename) {
      throw new Error(`Invalid action file path: ${actionFile.filename}`);
    }
    const file = filename.replace('.ts', '');
    const directory = parts.join('/');

    let entries = directories.get(directory);
    if (!entries) {
      entries = new Set();
      directories.set(directory, entries);
    }
    entries.add(file);
  }

  for (const directory of [...directories.keys()]) {
    const parentParts = directory.split('/');
    if (parentParts.length > 1) {
      const parentDirectory = parentParts.slice(0, -1).join('/');
      const childDirectory = parentParts[parentParts.length - 1];
      let parentEntries = directories.get(parentDirectory);
      if (!parentEntries) {
        parentEntries = new Set();
        directories.set(parentDirectory, parentEntries);
      }
      parentEntries.add(childDirectory);
    }
  }

  for (const [directory, entries] of directories) {
    const lines = [...entries]
      .sort()
      .map(
        (entry) =>
          `export * from './${entry}${resolvedOptions.importExtension}';`,
      );
    files.set(`${directory}/index.ts`, `${lines.join('\n')}\n`);
  }
}
