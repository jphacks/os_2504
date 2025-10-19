function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

export async function api<T>(input: RequestInfo | URL, init?: RequestInit) {
  const { headers: initHeaders, ...restInit } = init ?? {};
  const res = await fetch(input, {
    ...restInit,
    headers: {
      'Content-Type': 'application/json',
      ...normalizeHeaders(initHeaders),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `API Error: ${res.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as T;
}
