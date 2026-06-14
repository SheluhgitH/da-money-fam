import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'dmf_admin_session'

export function getAdminSession(): string | undefined {
  return cookies().get(ADMIN_COOKIE)?.value
}

export function isAdminAuthenticated(): boolean {
  const token = getAdminSession()
  return Boolean(token && token.length === 64)
}
