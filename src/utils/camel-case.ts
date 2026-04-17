export function camelCase(name: string): string {
  const leading = /^_+/.exec(name)?.[0] ?? '';
  return (
    leading +
    name
      .slice(leading.length)
      .replace(/[-_]([a-z])/g, (_match, character: string) =>
        character.toUpperCase(),
      )
  );
}
