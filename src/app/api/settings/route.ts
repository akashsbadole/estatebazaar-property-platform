import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/auth'

// GET /api/settings — public settings (non-secret only)
// Returns a flat key-value object of public site settings (e.g., maintenance mode).
export async function GET(_request: NextRequest) {
  const settings = await db.siteSetting.findMany({
    where: { isSecret: false },
  })
  const flat: Record<string, string> = {}
  for (const s of settings) {
    flat[s.key] = s.value
  }
  return jsonResponse({ settings: flat })
}
