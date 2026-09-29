/** Shape openapi-fetch returns from every call: exactly one of `data`/`error`, plus the Response. */
export interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Turn an openapi-fetch result into a value or a throw, so it composes with TanStack Query
 * (which treats a thrown error as the query/mutation error). The thrown value is the parsed
 * problem+json / validation body, which `parseApiError` knows how to read.
 */
export function unwrap<T>(result: FetchResult<T>): T {
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.data === undefined) {
    throw new Error(`Empty response body (HTTP ${String(result.response.status)}).`);
  }
  return result.data;
}

/** Assert a no-content (204) call succeeded; throws the parsed error otherwise. */
export function unwrapVoid(result: FetchResult<unknown>): void {
  if (result.error !== undefined) {
    throw result.error;
  }
}

/** Read the strong ETag off a response, if the endpoint sent one. Used for If-Match flows. */
export function etagOf(response: Response): string | null {
  return response.headers.get("ETag");
}
