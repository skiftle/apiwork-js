import { snakeCase } from './snake-case';

/** @internal */
export function kebabCase(name: string): string {
  return snakeCase(name).replace(/_/g, '-');
}
