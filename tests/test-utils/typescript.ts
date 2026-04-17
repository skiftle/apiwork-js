import ts from 'typescript';

export function getSyntaxDiagnostics(
  fileName: string,
  source: string,
): readonly ts.DiagnosticWithLocation[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return (
    sourceFile as ts.SourceFile & {
      parseDiagnostics: ts.DiagnosticWithLocation[];
    }
  ).parseDiagnostics;
}

export function formatDiagnostics(
  diagnostics: readonly ts.Diagnostic[],
): string {
  return diagnostics
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      );
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        return `${diagnostic.file.fileName}:${line + 1}:${character + 1} - ${message}`;
      }
      return message;
    })
    .join('\n');
}
