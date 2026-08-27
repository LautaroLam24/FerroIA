const TOKEN_KEY = 'ferreteria_token';
const USER_KEY = 'ferreteria_user';

export type UserRole = 'ADMIN' | 'OPERARIO';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}
