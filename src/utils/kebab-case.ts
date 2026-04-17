import { snakeCase } from './snake-case';

export function kebabCase(name: string): string {
  return snakeCase(name).replace(/_/g, '-');
}
