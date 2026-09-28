/**
 * Turn an API error body into something the UI can render: a form-level message plus per-field
 * messages. Handles the two shapes the backend produces:
 *   - RFC 9457 problem+json ({ type, title, status, detail, ... }) for 4xx business errors.
 *   - FastAPI's HTTPValidationError ({ detail: [{ loc, msg, type }] }) for 422 request validation.
 *
 * openapi-fetch returns the parsed error body as `unknown`-ish, so everything here is narrowed at
 * runtime rather than trusted from a type.
 */

export interface ParsedApiError {
  /** A single human-readable message suitable for an alert. */
  message: string;
  /** field name -> message, for mapping onto form inputs. */
  fieldErrors: Record<string, string>;
}

interface ProblemJson {
  title?: string;
  detail?: string;
  status?: number;
}

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidationItem(value: unknown): value is ValidationItem {
  return (
    isRecord(value) &&
    Array.isArray(value.loc) &&
    typeof value.msg === "string" &&
    typeof value.type === "string"
  );
}

/**
 * The last string element of a FastAPI `loc` is the field name; the earlier elements are the
 * request part (e.g. "body"). `["body", "email"]` -> "email".
 */
function fieldFromLoc(loc: (string | number)[]): string | null {
  for (let i = loc.length - 1; i >= 0; i -= 1) {
    const part = loc[i];
    if (typeof part === "string" && part !== "body" && part !== "query" && part !== "path") {
      return part;
    }
  }
  return null;
}

export function parseApiError(error: unknown): ParsedApiError {
  if (!isRecord(error)) {
    return { message: GENERIC_MESSAGE, fieldErrors: {} };
  }

  // 422 validation error: array of per-field problems.
  if (Array.isArray(error.detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const item of error.detail) {
      if (!isValidationItem(item)) continue;
      const field = fieldFromLoc(item.loc);
      if (field !== null && !(field in fieldErrors)) {
        fieldErrors[field] = item.msg;
      }
    }
    const count = Object.keys(fieldErrors).length;
    return {
      message: count > 0 ? "Please correct the highlighted fields." : "The request was invalid.",
      fieldErrors,
    };
  }

  // problem+json: prefer `detail`, fall back to `title`.
  const problem = error as ProblemJson;
  if (typeof problem.detail === "string" && problem.detail.length > 0) {
    return { message: problem.detail, fieldErrors: {} };
  }
  if (typeof problem.title === "string" && problem.title.length > 0) {
    return { message: problem.title, fieldErrors: {} };
  }

  return { message: GENERIC_MESSAGE, fieldErrors: {} };
}

/** Convenience for the common case where only a single message is needed. */
export function errorMessage(error: unknown): string {
  return parseApiError(error).message;
}
