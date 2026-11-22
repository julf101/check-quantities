export async function fetchCatalog(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value) qs.set(key, value);
  }
  const res = await fetch(`/api/catalog?${qs}`);
  if (!res.ok) throw new Error('catalog request failed');
  return res.json();
}

export async function fetchModel(code) {
  const res = await fetch(`/api/catalog/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error('product request failed');
  return res.json();
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/imports', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'upload failed');
    err.code = body.code;
    err.params = body.params;
    throw err;
  }
  return body;
}

export async function fetchImport(id) {
  const res = await fetch(`/api/imports/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('import request failed');
  return res.json();
}

export async function fetchImports() {
  const res = await fetch('/api/imports');
  if (!res.ok) throw new Error('history request failed');
  return res.json();
}

export async function fetchStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('status request failed');
  return res.json();
}
