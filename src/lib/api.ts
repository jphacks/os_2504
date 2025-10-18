export async function api<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
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
