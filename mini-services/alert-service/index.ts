// Saved Search Alert Service
// Runs every 5 minutes, checks all enabled saved searches for new matching
// properties, and sends email alerts when new matches are found.
//
// This replaces the manual admin trigger with an automatic background job.

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const API_BASE = process.env.API_BASE || 'http://localhost:3000'

// Admin credentials for the alert-check endpoint (which is admin-only)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@estatebazaar.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123'

let sessionCookie: string | null = null

async function login(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })
    if (!res.ok) {
      console.error(`[alert-service] Login failed: ${res.status}`)
      return false
    }
    // Extract session cookie from Set-Cookie header
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) {
      const match = setCookie.match(/olx_session=([^;]+)/)
      if (match) {
        sessionCookie = `olx_session=${match[1]}`
        console.log('[alert-service] Logged in as admin')
        return true
      }
    }
    console.error('[alert-service] No session cookie in response')
    return false
  } catch (err: any) {
    console.error('[alert-service] Login error:', err.message)
    return false
  }
}

async function checkAlerts(): Promise<void> {
  if (!sessionCookie) {
    const ok = await login()
    if (!ok) return
  }

  try {
    const res = await fetch(`${API_BASE}/api/saved-searches/check-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie!,
      },
    })

    if (res.status === 401) {
      // Session expired — re-login
      console.log('[alert-service] Session expired, re-logging in...')
      sessionCookie = null
      await login()
      return
    }

    if (!res.ok) {
      console.error(`[alert-service] Check alerts failed: ${res.status}`)
      return
    }

    const data = await res.json()
    console.log(`[${new Date().toISOString()}] Checked ${data.alertsChecked} searches, ${data.totalNewMatches} new matches, ${data.totalAlertsSent} emails sent`)
  } catch (err: any) {
    console.error('[alert-service] Check alerts error:', err.message)
  }
}

async function main() {
  console.log('[alert-service] Started — checking saved search alerts every 5 minutes')

  // Run immediately on startup
  await checkAlerts()

  // Then every 5 minutes
  setInterval(checkAlerts, CHECK_INTERVAL_MS)
}

main()
