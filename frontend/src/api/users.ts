import { http } from './http';
import type { UserRole } from './token';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export function listUsers(): Promise<ApiUser[]> {
  return http.get<ApiUser[]>('/users');
}

export function createUser(input: CreateUserInput): Promise<ApiUser> {
  return http.post<ApiUser>('/users', input);
}

export function deleteUser(id: string): Promise<void> {
  return http.delete<void>(`/users/${id}`);
}
