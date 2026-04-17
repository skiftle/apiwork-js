export type { SchemaOptions } from './domain';
export type { EndpointOptions } from './endpoint';
export type {
  FileCase,
  GenerateOptions,
  GeneratorContext,
  IdentifierSource,
  ResolvedGenerateOptions,
} from './options';

export { buildSchemas, buildScopeIndex } from './domain';
export { buildEndpoints } from './endpoint';
export { writeFiles } from './fs';
export {
  formatFileName,
  resolveClientIdentifier,
  resolveDomainIdentifier,
  resolveEndpointIdentifier,
  resolveGenerateOptions,
} from './options';
export {
  collectParamReferences,
  collectTypeReferences,
} from './references';
