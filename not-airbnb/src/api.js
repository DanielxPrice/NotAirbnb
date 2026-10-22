import { previewMode, previewResponse } from './preview';
// Use a same-origin proxy in development and production.
export async function api(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  if (previewMode()) return previewResponse(path, method);
  const isForm = body instanceof FormData;
  const response = await fetch('/api' + path, {
    ...options, method, credentials: 'include',
    headers: { 'X-Requested-With': 'NotAirbnb', ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({ error: 'The server could not be reached' }));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: response.status });
  return data;
}
