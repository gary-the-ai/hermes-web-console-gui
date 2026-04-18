import { getBackendAuthKey } from '../store/backendStore';

export function buildBackendHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init || {});
  const authKey = getBackendAuthKey();
  if (authKey && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authKey}`);
  }
  return headers;
}

export async function backendFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: buildBackendHeaders(init.headers),
  });
}
