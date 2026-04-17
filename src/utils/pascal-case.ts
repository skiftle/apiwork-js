import { camelCase } from './camel-case';

export function pascalCase(name: string): string {
  return camelCase(name).replace(/^[a-z]/, (character) =>
    character.toUpperCase(),
  );
}
