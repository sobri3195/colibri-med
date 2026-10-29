export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(code + ": " + message);
    this.name = "ApiError";
  }
}
export function errorCode(error: unknown) {
  return error instanceof ApiError
    ? error.code
    : (/^(?:Error: )?([A-Z_]+):/.exec(String(error))?.[1] ?? "NETWORK");
}
export function deliveryStatus(error: unknown) {
  switch (errorCode(error)) {
    case "CONFLICT":
      return "Konflik perubahan";
    case "PARTIAL_FAILURE":
      return "Perlu rekonsiliasi";
    case "UNAUTHORIZED":
      return "Sesi diperlukan";
    case "VALIDATION":
    case "FORBIDDEN":
    case "WORKFLOW":
    case "OPERATION_REUSE":
      return "Perlu ditinjau";
    default:
      return "Gagal dikirim";
  }
}
export const blockedDelivery = (status: string) =>
  ["Konflik perubahan", "Perlu rekonsiliasi", "Perlu ditinjau"].includes(
    status,
  );
