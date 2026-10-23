const BASE = import.meta.env.VITE_API_URL || '/api';
const KEY = 'dg_token';
export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(KEY); } catch { return null; } },
  set: (t) => { try { sessionStorage.setItem(KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, code, status, details) { super(message); this.code = code; this.status = status; this.details = details; }
}
/** Map validation details [{field,message}] -> { field: message } for inline form errors. */
export const fieldErrors = (err) => Object.fromEntries((err?.details || []).filter((d) => d && d.field).map((d) => [d.field, d.message]));
export const qs = (o = {}) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)); const s = p.toString(); return s ? `?${s}` : ''; };

async function request(method, path, body) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(BASE + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError('Cannot reach the server. Check your connection and try again.', 'NETWORK', 0); }
  return res;
}
async function json(method, path, body) {
  const res = await request(method, path, body);
  let payload = null; try { payload = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !payload?.success) {
    if (res.status === 401 && tokenStore.get() && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(payload?.error?.message || 'Something went wrong. Please try again.', payload?.error?.code || 'SERVER_ERROR', res.status, payload?.error?.details);
  }
  return payload;
}
export const api = {
  get: (p) => json('GET', p).then((r) => r.data), getFull: (p) => json('GET', p),
  post: (p, b = {}) => json('POST', p, b).then((r) => r.data), put: (p, b) => json('PUT', p, b).then((r) => r.data),
  patch: (p, b) => json('PATCH', p, b).then((r) => r.data), del: (p) => json('DELETE', p).then((r) => r.data),
  async download(path, filename) {
    const res = await request('GET', path);
    if (!res.ok) { let m = 'Download failed.'; try { m = (await res.json()).error.message; } catch { /* keep default */ } throw new ApiError(m, 'DOWNLOAD', res.status); }
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
};
