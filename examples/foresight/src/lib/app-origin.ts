export function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin;
}
