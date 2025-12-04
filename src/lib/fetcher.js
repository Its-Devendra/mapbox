export async function apiFetch(path, opts = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE || '';
  const headers = opts.headers || {};
  // If we have admin key in localStorage (dev), attach it for admin calls.
  try {
    if (typeof window !== 'undefined') {
      const adminKey = localStorage.getItem('admin_key') || process.env.NEXT_PUBLIC_ADMIN_KEY;
      if (adminKey) headers['x-admin-api-key'] = adminKey;
    }
  } catch (e) {}
  const res = await fetch(base + path, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}
