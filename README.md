# apiwork-js

JavaScript toolkit for [Apiwork](https://apiwork.dev).

Provides a parser, TypeScript types, and code generators for TypeScript, [Zod](https://zod.dev), and [Sorbus](https://sorbus.dev).

## Installation

```bash
npm install apiwork
# or
pnpm add apiwork
```

## Schema

The [Apiwork schema](https://apiwork.dev/guide/exports/apiwork) is a portable JSON description of your API. Parse it and work with typed, camelCased objects:

```ts
import { parse } from 'apiwork';
import type { Schema, Resource, Action, Param } from 'apiwork';

// From raw JSON data
const schema = parse(data);

// From a URL
const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');

// From a file
const schema = await parse.file('./apiwork.json');

for (const resource of schema.resources) {
  console.log(resource.identifier);
}
```

> `parse.url()` and `parse.file()` throw `ParseError` on failure, with the underlying error preserved on `error.cause`.

## CLI

```bash
apiwork typescript ./apiwork.json --outdir src/api/sorbus
apiwork zod ./apiwork.json --outdir src/api/sorbus
apiwork sorbus ./apiwork.json --outdir src/api/sorbus
```

The source can be a local file or a URL:

```bash
apiwork sorbus http://localhost:3000/api/v1/.apiwork --outdir src/api/sorbus
```

## Generators

### TypeScript

Generates pure TypeScript types from representations and enums. Use this if you only need types without runtime validation.

### Zod

Generates Zod validation schemas alongside TypeScript types. Use this if you need runtime validation without a typed HTTP client.

### Sorbus

Generates a typed [Sorbus](https://sorbus.dev) client with operations, schemas, and endpoints. Includes everything from the TypeScript and Zod generators.

## Options

All three generators share common options (`fileCase`, `importExtension`, `transformIdentifier`) plus their own `version` for the output they produce:

```ts
import { generate } from 'apiwork/sorbus';

const files = generate(schema, {
  version: 1,                     // Sorbus major version (default: 1)
  zod: { version: 4 },            // Zod inline-schemas (default: 4)
  typescript: { version: 5 },     // TypeScript types (default: 5)
  fileCase: 'kebab',
  importExtension: '.js',
  transformIdentifier: (identifier, source) => {
    if (source === 'api') return `Api${identifier}`;
    if (source === 'client' && identifier === 'Client') return 'MyClient';
    return identifier;
  },
});
```

### `version`

Each generator targets a specific major version of its output:

| Generator | `version` | Default |
|---|---|---|
| `apiwork/typescript` | TypeScript major | `5` |
| `apiwork/zod` | Zod major | `4` |
| `apiwork/sorbus` | Sorbus major | `1` |

Generators that produce output for multiple libraries take nested configuration:

```ts
// apiwork/typescript — just TS version
generate(schema, { version: 5 });

// apiwork/zod — Zod version + TS version for exported types
generate(schema, {
  version: 4,
  typescript: { version: 5 },
});

// apiwork/sorbus — Sorbus version + Zod + TS
generate(schema, {
  version: 1,
  zod: { version: 4 },
  typescript: { version: 5 },
});
```

### `fileCase`

The file name case format. Accepts `'kebab'` (default), `'camel'`, `'pascal'`, or `'snake'`.

| Value | Example |
|---|---|
| `'kebab'` | `invoice-line-item.ts` |
| `'camel'` | `invoiceLineItem.ts` |
| `'pascal'` | `InvoiceLineItem.ts` |
| `'snake'` | `invoice_line_item.ts` |

### `importExtension`

The extension appended to relative import paths. Accepts `''` (default), `'.js'`, or `'.ts'`. Use `'.js'` for Node ESM or Deno.

```ts
// importExtension: ''   →  from '../api'
// importExtension: '.js' →  from '../api.js'
```

### `transformIdentifier`

A callback invoked for every identifier the generator emits. Return the name unchanged to keep the default, or return a new name to rename it.

```ts
transformIdentifier?: (identifier: string, source: IdentifierSource) => string;

type IdentifierSource = 'domain' | 'api' | 'endpoint' | 'client';
```

| `source` | Covers |
|---|---|
| `'domain'` | Types and schemas in `domains/*` (scoped domain types). |
| `'api'` | Types and schemas in `api.ts` (global domain types — highest collision risk). |
| `'endpoint'` | Types and schemas in `endpoints/*` (request, response, definition). |
| `'client'` | Sorbus-specific symbols: `Client`, `createClient`, `contract`. |

Example — prefix all global types and rename the Sorbus client:

```ts
transformIdentifier: (identifier, source) => {
  if (source === 'api') return `Api${identifier}`;
  if (source === 'client' && identifier === 'Client') return 'SkiftleClient';
  if (source === 'client' && identifier === 'createClient') return 'createSkiftleClient';
  return identifier;
}
```

## Generated output

Given this Apiwork schema:

```json
{
  "enums": [
    { "name": "invoice_status", "values": ["draft", "sent", "paid"] }
  ],
  "types": [
    {
      "name": "invoice",
      "type": "object",
      "shape": [
        { "name": "id", "type": "string" },
        { "name": "number", "type": "string" },
        { "name": "status", "type": "string", "enum": "invoice_status" },
        { "name": "issuedOn", "type": "date", "nullable": true },
        { "name": "createdAt", "type": "datetime" },
        { "name": "updatedAt", "type": "datetime" }
      ]
    }
  ],
  "resources": [
    {
      "identifier": "invoices",
      "path": "invoices",
      "actions": [
        { "name": "invoices.index", "method": "get", "path": "/invoices" },
        { "name": "invoices.show", "method": "get", "path": "/invoices/:id" },
        { "name": "invoices.create", "method": "post", "path": "/invoices" },
        { "name": "invoices.destroy", "method": "delete", "path": "/invoices/:id" }
      ]
    }
  ]
}
```

`apiwork sorbus` generates:

```
api.ts
domains/
  index.ts
endpoints/
  invoices.ts
  index.ts
contract.ts
client.ts
```

See the [full generated output](https://apiwork.dev/examples/representations#codegen) for a complete example.

## Frontend integration

Add a script to generate the client from your API:

```json
{
  "scripts": {
    "sorbus": "apiwork sorbus http://localhost:3000/api/v1/.apiwork --outdir src/api/sorbus"
  }
}
```

```bash
pnpm sorbus
```

Optionally, format the generated output:

```json
{
  "scripts": {
    "sorbus": "apiwork sorbus http://localhost:3000/api/v1/.apiwork --outdir src/api/sorbus && biome check --write src/api/sorbus"
  }
}
```

Using Prettier or Oxfmt? Replace `biome check --write` with `prettier --write` or `oxfmt`.

Use the generated client:

```ts
import { createClient } from './sorbus/client';

const api = createClient('http://localhost:3000/api/v1');

const { invoices } = await api.invoices.index();

const { invoice } = await api.invoices.show({ id: '1' });

const result = await api.invoices.create(
  { invoice: { number: 'INV-001', customerId: '1' } },
  { catch: [422] },
);

if (!result.ok) {
  console.log(result.data);
}
```

## API Reference

### `apiwork`

Parser and schema types.

**Values:**
- `parse(data)` — parse raw JSON data into a `Schema`
- `parse.url(url)` — fetch and parse from a URL
- `parse.file(path)` — read and parse from a file
- `ParseError` — thrown on parse failures, with `cause` on `error.cause`

**Types:**

`Action`, `ActionMethod`, `ActionRequest`, `ActionResponse`, `ArrayParam`, `BinaryParam`, `BooleanParam`, `DateParam`, `DatetimeParam`, `DecimalParam`, `Enum`, `ErrorCode`, `FileCase`, `GenerateOptions`, `IdentifierSource`, `Info`, `InfoContact`, `InfoLicense`, `InfoServer`, `IntegerParam`, `LiteralParam`, `NumberParam`, `ObjectParam`, `ObjectType`, `Param`, `RecordParam`, `ReferenceParam`, `Resource`, `Schema`, `StringParam`, `TimeParam`, `Type`, `UnionParam`, `UnionType`, `UnknownParam`, `UuidParam`

### `apiwork/typescript`

TypeScript code generator — produces pure TypeScript types from the schema.

- `generate(schema, options?)` — returns a `Map<string, string>` of file paths to file contents
- `TypescriptGenerateOptions` — options type

### `apiwork/zod`

Zod code generator — produces Zod schemas plus TypeScript types.

- `generate(schema, options?)` — returns a `Map<string, string>` of file paths to file contents
- `ZodGenerateOptions` — options type

### `apiwork/sorbus`

Sorbus code generator — produces a typed Sorbus client, contract, Zod schemas, and TypeScript types.

- `generate(schema, options?)` — returns a `Map<string, string>` of file paths to file contents
- `SorbusGenerateOptions` — options type

---

All exported symbols carry full TSDoc. Hover over any import in your IDE to see descriptions, parameter docs, and examples.

## License

MIT
