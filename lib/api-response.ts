export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Array<{ field?: string; message: string }>;
};

export function createErrorResponse(status: number, error: ApiError) {
  return Response.json({ success: false, error }, { status });
}
