import jwt from 'jsonwebtoken'
import { parse, serialize } from 'cookie'
import type { H3Event } from 'h3'

const SECRET = process.env.JWT_SECRET || 'ticketing-secret-key-2024'
const COOKIE_NAME = 'tkt_token'

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): any {
  try { return jwt.verify(token, SECRET) }
  catch { return null }
}

export function setAuthCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })
}

export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME)
}

export function getTokenFromEvent(event: H3Event): string | null {
  const cookieHeader = getRequestHeader(event, 'cookie') || ''
  const cookies = parse(cookieHeader)
  return cookies[COOKIE_NAME] || null
}

export function getUserFromEvent(event: H3Event): any {
  const token = getTokenFromEvent(event)
  if (!token) return null
  return verifyToken(token)
}

// Simple password hashing (use bcrypt in production)
export function hashPassword(password: string): string {
  // For demo: base64 encode with salt. In production use bcryptjs
  return Buffer.from(`salt:${password}:ticketing2024`).toString('base64')
}

export function verifyPassword(password: string, hash: string): boolean {
  // Handle seeded demo accounts
  if (hash === 'demo_password_hashed') return password === 'password123'
  return hashPassword(password) === hash
}
