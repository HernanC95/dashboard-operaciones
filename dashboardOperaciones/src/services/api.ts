// src/services/api.ts
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  options?: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    body:
      options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : (data as any)?.message ?? res.statusText;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body }),
};
