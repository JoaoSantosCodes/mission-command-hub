/** Remove prefixo típico de `Error` para mensagens legíveis na UI. */
export function formatUserFacingError(message: string): string {
  return message.replace(/^Error:\s*/i, '').trim();
}
