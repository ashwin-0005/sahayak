export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err: ApiError = body?.error ?? { code: "NETWORK_ERROR", message: "Request failed" };
    throw new ApiErrorClass(err.code, err.message, err.details);
  }
  return body as T;
}

export class ApiErrorClass extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export async function postLogin(workerId: string, pin: string): Promise<{ token: string; worker: { id: string; name: string; village: string } }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerId, pin })
  });
  return handle(res);
}

export async function postSync(
  token: string,
  payload: { lastPulledAt: string | null; patients: unknown[]; visits: unknown[] }
): Promise<{ patients: Record<string, unknown>[]; visits: Record<string, unknown>[]; serverTime: string }> {
  const res = await fetch(`${API_URL}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  return handle(res);
}