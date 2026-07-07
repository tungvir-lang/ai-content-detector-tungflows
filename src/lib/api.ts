const TOKEN_KEY = 'meheal_admin_token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(method: string, url: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error || `Lỗi ${res.status}`) as Error & {status?: number; locked?: boolean};
    err.status = res.status;
    err.locked = data.locked;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = any>(u: string) => request<T>('GET', u),
  post: <T = any>(u: string, b?: unknown) => request<T>('POST', u, b),
  // authenticated (admin)
  aget: <T = any>(u: string) => request<T>('GET', u, undefined, true),
  apost: <T = any>(u: string, b?: unknown) => request<T>('POST', u, b, true),
  aput: <T = any>(u: string, b?: unknown) => request<T>('PUT', u, b, true),
  adel: <T = any>(u: string) => request<T>('DELETE', u, undefined, true),
};

/** Tải file (Excel/Word) qua endpoint có xác thực admin. */
export async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(`/api${url}`, {headers: {Authorization: `Bearer ${getToken()}`}});
  if (!res.ok) throw new Error('Không tải được file.');
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename="(.+?)"/);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = m?.[1] || fallbackName;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const money = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export const STATUS: Record<string, {label: string; cls: string}> = {
  pending: {label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700'},
  confirmed: {label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-700'},
  in_progress: {label: 'Đang khám', cls: 'bg-purple-100 text-purple-700'},
  completed: {label: 'Hoàn thành', cls: 'bg-green-100 text-green-700'},
  cancelled: {label: 'Đã hủy', cls: 'bg-gray-200 text-gray-600'},
};
