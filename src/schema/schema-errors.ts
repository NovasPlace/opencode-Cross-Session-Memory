export interface PgLikeError {
  code?: string;
  message?: string;
}

export function isOwnershipLimitedSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const pgError = error as PgLikeError;
  if (pgError.code !== '42501') return false;
  const message = (pgError.message ?? '').toLowerCase();
  return message.includes('must be owner of table')
    || message.includes('must be owner of relation')
    || message.includes('must be owner of index');
}
