/**
 * The top-level Apiwork schema representing an API.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 *
 * const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');
 * console.log(schema.basePath); // '/api/v1'
 * ```
 */
export interface Schema {
  /** The API base path (e.g. `/api/v1`). */
  basePath: string;
  /** The named enum definitions. */
  enums: Enum[];
  /** The error codes the API may emit. */
  errorCodes: ErrorCode[];
  /** The stable 16-character identifier for the API. */
  fingerprint: string;
  /** The API metadata. `null` when unset. */
  info: Info | null;
  /** The locales the API supports. */
  locales: string[];
  /** The resources with nested actions. */
  resources: Resource[];
  /** The named type definitions in topological order. */
  types: Type[];
}

/**
 * A named type definition — either an object type or a discriminated union.
 */
export type Type = ObjectType | UnionType;

/**
 * An object type definition with named fields.
 */
export interface ObjectType {
  /** Whether the type is deprecated. */
  deprecated: boolean;
  /** The description from metadata. `null` when unset. */
  description: string | null;
  /** The example value. `null` when unset. */
  example: unknown;
  /** The names of types this type extends. */
  extends: string[];
  /** The type name. */
  name: string;
  /** Whether the type references itself transitively. */
  recursive: boolean;
  /** The scope the type lives in. `null` for global scope. */
  scope: string | null;
  /** The fields that make up the type. */
  shape: Param[];
  /** The type discriminator. */
  type: 'object';
}

/**
 * A discriminated union type with variants.
 */
export interface UnionType {
  /** Whether the type is deprecated. */
  deprecated: boolean;
  /** The description from metadata. `null` when unset. */
  description: string | null;
  /** The discriminator field name. `null` for open unions. */
  discriminator: string | null;
  /** The example value. `null` when unset. */
  example: unknown;
  /** The type name. */
  name: string;
  /** Whether the type references itself transitively. */
  recursive: boolean;
  /** The scope the type lives in. `null` for global scope. */
  scope: string | null;
  /** The type discriminator. */
  type: 'union';
  /** The union variants. */
  variants: Param[];
}

/**
 * A parameter in a type shape, request, or response.
 */
export type Param =
  | ArrayParam
  | BinaryParam
  | BooleanParam
  | DateParam
  | DatetimeParam
  | DecimalParam
  | IntegerParam
  | LiteralParam
  | NumberParam
  | ObjectParam
  | RecordParam
  | ReferenceParam
  | StringParam
  | TimeParam
  | UnionParam
  | UnknownParam
  | UuidParam;

interface ParamBase {
  deprecated: boolean;
  description: string | null;
  name: string;
  nullable: boolean;
  optional: boolean;
}

export interface ArrayParam extends ParamBase {
  default?: unknown;
  example: unknown;
  max: number | null;
  min: number | null;
  of: Param | null;
  type: 'array';
}

export interface BinaryParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  type: 'binary';
}

export interface BooleanParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  type: 'boolean';
}

export interface DateParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  type: 'date';
}

export interface DatetimeParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  type: 'datetime';
}

export interface DecimalParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  max: number | null;
  min: number | null;
  type: 'decimal';
}

export interface IntegerParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  format: string | null;
  max: number | null;
  min: number | null;
  type: 'integer';
}

export interface LiteralParam extends ParamBase {
  type: 'literal';
  value: unknown;
}

export interface NumberParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  max: number | null;
  min: number | null;
  type: 'number';
}

export interface ObjectParam extends ParamBase {
  partial: boolean;
  shape: Param[];
  type: 'object';
}

export interface RecordParam extends ParamBase {
  default?: unknown;
  example: unknown;
  of: Param | null;
  type: 'record';
}

export interface ReferenceParam extends ParamBase {
  reference: string;
  tag?: string;
  type: 'reference';
}

export interface StringParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  format: string | null;
  max: number | null;
  min: number | null;
  type: 'string';
}

export interface TimeParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  type: 'time';
}

export interface UnionParam extends ParamBase {
  discriminator: string | null;
  type: 'union';
  variants: Param[];
}

export interface UnknownParam extends ParamBase {
  type: 'unknown';
}

export interface UuidParam extends ParamBase {
  default?: unknown;
  enum: string | undefined;
  example: unknown;
  type: 'uuid';
}

/**
 * A resource grouping actions at a URL path.
 */
export interface Resource {
  /** The actions the resource exposes. */
  actions: Action[];
  /** The resource identifier. */
  identifier: string;
  /** The resource name. */
  name: string;
  /** The identifiers of ancestor resources. */
  parentIdentifiers: string[];
  /** The URL path. */
  path: string;
  /** The nested resources. */
  resources: Resource[];
  /** The scope the resource lives in. `null` for global scope. */
  scope: string | null;
}

/**
 * The HTTP method of an action.
 */
export type ActionMethod = 'delete' | 'get' | 'patch' | 'post' | 'put';

/**
 * An API action at a specific HTTP method and path.
 */
export interface Action {
  /** Whether the action is deprecated. */
  deprecated: boolean;
  /** The description. `null` when unset. */
  description: string | null;
  /** The HTTP method. */
  method: ActionMethod;
  /** The action name. */
  name: string;
  /** The operation ID. `null` when unset. */
  operationId: string | null;
  /** The URL path. */
  path: string;
  /** The names of error codes the action may raise. */
  raises: string[];
  /** The request definition. */
  request: ActionRequest;
  /** The response definition. */
  response: ActionResponse;
  /** The summary. `null` when unset. */
  summary: string | null;
  /** The tags for grouping. */
  tags: string[];
}

/**
 * The request definition of an action.
 */
export interface ActionRequest {
  /** The body parameters. */
  body: Param[];
  /** The description. `null` when unset. */
  description: string | null;
  /** The query parameters. */
  query: Param[];
}

/**
 * The response definition of an action.
 */
export interface ActionResponse {
  /** The response body. `null` when the action returns no content. */
  body: Param | null;
  /** The description. `null` when unset. */
  description: string | null;
  /** Whether the action returns no content. */
  noContent: boolean;
}

/**
 * A named enum definition with string values.
 */
export interface Enum {
  /** Whether the enum is deprecated. */
  deprecated: boolean;
  /** The description. `null` when unset. */
  description: string | null;
  /** The example value. `null` when unset. */
  example: string | null;
  /** The enum name. */
  name: string;
  /** The scope the enum lives in. `null` for global scope. */
  scope: string | null;
  /** The allowed values. */
  values: string[];
}

/**
 * An error code the API may emit.
 */
export interface ErrorCode {
  /** The description. `null` when unset. */
  description: string | null;
  /** The error code name. */
  name: string;
  /** The HTTP status code. */
  status: number;
}

/**
 * The API metadata.
 */
export interface Info {
  /** The contact info. `null` when unset. */
  contact: InfoContact | null;
  /** The description. `null` when unset. */
  description: string | null;
  /** The license info. `null` when unset. */
  license: InfoLicense | null;
  /** The server URLs. */
  servers: InfoServer[];
  /** The summary. `null` when unset. */
  summary: string | null;
  /** The terms of service URL. `null` when unset. */
  termsOfService: string | null;
  /** The API title. `null` when unset. */
  title: string | null;
  /** The API version. `null` when unset. */
  version: string | null;
}

/**
 * The contact info of an API.
 */
export interface InfoContact {
  /** The contact email. `null` when unset. */
  email: string | null;
  /** The contact name. `null` when unset. */
  name: string | null;
  /** The contact URL. `null` when unset. */
  url: string | null;
}

/**
 * The license info of an API.
 */
export interface InfoLicense {
  /** The license name. `null` when unset. */
  name: string | null;
  /** The license URL. `null` when unset. */
  url: string | null;
}

/**
 * A server URL of an API.
 */
export interface InfoServer {
  /** The description. `null` when unset. */
  description: string | null;
  /** The server URL. `null` when unset. */
  url: string | null;
}
