import { api } from './api';
afterEach(() => jest.restoreAllMocks());
test('uses the same-origin session cookie and CSRF request header', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ saved: true }) });
  expect(await api('/example', { method: 'POST', body: { value: 1 } })).toEqual({ saved: true });
  expect(fetch).toHaveBeenCalledWith('/api/example', expect.objectContaining({ credentials: 'include', body: '{"value":1}', headers: { 'X-Requested-With': 'NotAirbnb', 'Content-Type': 'application/json' } }));
});
test('lets the browser set multipart boundaries and handles no-content responses', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
  const body = new FormData();
  body.append('image', new Blob(['image']), 'photo.png');
  expect(await api('/uploads', { method: 'POST', body })).toBeNull();
  expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
});
test('preserves API status and hides non-JSON gateway responses', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) });
  await expect(api('/private')).rejects.toMatchObject({ message: 'Forbidden', status: 403 });
  global.fetch.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('HTML response'); } });
  await expect(api('/private')).rejects.toMatchObject({ message: 'The server could not be reached', status: 502 });
});
