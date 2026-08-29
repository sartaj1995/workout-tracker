/**
 * Google Drive backup.
 *
 * Uses the `drive.file` scope, which only ever grants access to files this app
 * itself created — Google classes it as non-sensitive, so it needs no app
 * verification and shows no "unverified app" warning. Your other Drive files
 * are invisible to it.
 *
 * There is no backend: the browser talks to Drive directly. The client ID is
 * public by design for this flow.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FILE_NAME = 'workout-tracker-backup.json'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/** Without a client ID the whole feature stays hidden rather than half-working. */
export const driveConfigured = Boolean(CLIENT_ID)

export interface RemoteFile {
  id: string
  modifiedTime: string
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface GoogleGis {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        prompt?: string
        callback: (response: TokenResponse) => void
        error_callback?: (error: { type?: string }) => void
      }) => TokenClient
      revoke: (token: string, done?: () => void) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleGis
  }
}

let gisLoading: Promise<GoogleGis> | null = null

function loadGis(): Promise<GoogleGis> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google)
  if (gisLoading) return gisLoading

  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    const script = existing ?? document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google)
      else reject(new Error("Google's sign-in library loaded but looks wrong."))
    }
    script.onerror = () => {
      gisLoading = null
      reject(new Error("Couldn't reach Google. Are you online?"))
    }
    if (!existing) document.head.appendChild(script)
  })
  return gisLoading
}

/**
 * Fetch Google's sign-in library ahead of time.
 *
 * A sign-in popup is only allowed while the browser still considers your tap
 * recent — a few seconds. Downloading a script inside that window can eat all
 * of it, and the popup is then blocked rather than shown. So the library is
 * pulled in on app open, and the tap that matters finds it already there.
 */
export function warmUp(): void {
  if (!CLIENT_ID) return
  void loadGis().catch(() => {
    // Offline, most likely. The next real attempt will try again.
  })
}

const TOKEN_KEY = 'workout-tracker/drive-token'
/**
 * That consent has been given at some point. Deliberately separate from the
 * token: the token is dropped whenever it expires or Drive rejects it, and
 * losing the fact of the grant along with it means asking for the full consent
 * screen again when a quiet re-issue would have done.
 */
const GRANT_KEY = 'workout-tracker/drive-granted'

let accessToken: string | null = null
let expiresAt = 0

// Kept across reloads so a backup owed from the gym can go up on its own when
// you get home, instead of waiting for another tap. Short-lived, and it only
// ever unlocks the one file this app created.
try {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as { token: string; expiresAt: number }
    accessToken = parsed.token
    expiresAt = parsed.expiresAt
  }
} catch {
  // Unreadable or blocked; we just start without a token.
}

function remember(token: string | null, expiry: number): void {
  accessToken = token
  expiresAt = expiry
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt: expiry }))
      localStorage.setItem(GRANT_KEY, '1')
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // In-memory only for this session, which is still useful.
  }
}

export function hasLiveToken(): boolean {
  return Boolean(accessToken) && Date.now() < expiresAt - 60_000
}

/** Thrown when a sign-in is needed but no user gesture is available. */
export const NEEDS_SIGN_IN = 'Google sign-in needed.'

/**
 * One token request at a time. Two callers wanting a token moments apart —
 * the tap that primes it and the backup that follows — must not raise two
 * sign-in windows.
 */
let pending: Promise<string> | null = null

function requestToken(gis: GoogleGis, clientId: string): Promise<string> {
  if (pending) return pending
  pending = new Promise<string>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Google did not return a token.'))
          return
        }
        remember(response.access_token, Date.now() + (response.expires_in ?? 3600) * 1000)
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(
          new Error(
            error.type === 'popup_closed'
              ? 'Sign-in was closed before it finished.'
              : 'Google sign-in failed.',
          ),
        )
      },
    })
    client.requestAccessToken({ prompt: hasEverGranted() ? '' : 'consent' })
  }).finally(() => {
    pending = null
  })
  return pending
}

/**
 * Renew the token from inside a tap handler, for the backup that follows.
 *
 * Safari only opens a sign-in window from the handler itself — not from an
 * await that settles a moment later — so the request has to be started here
 * rather than left to the backup. Everything that would make a window appear
 * out of nowhere is refused: no grant yet, no library loaded yet, offline. In
 * those cases the backup's own attempt is the fallback.
 *
 * Fire-and-forget by design. Whatever it achieves, `authorise` picks up: a
 * fresh token, the same in-flight request, or nothing.
 */
export function primeToken(): void {
  if (!CLIENT_ID || hasLiveToken() || pending) return
  if (navigator.onLine === false || !hasEverGranted()) return
  const gis = window.google
  if (!gis?.accounts?.oauth2) return
  requestToken(gis, CLIENT_ID).catch(() => {
    // The caller's backup reports the failure; this is only a head start.
  })
}

/**
 * Only an `interactive` call — one made from a tap — may reach Google. A stored
 * token is reused either way, so a backup owed from the gym can still go up on
 * its own once you're home, as long as it's within the token's hour.
 */
export async function authorise(interactive: boolean): Promise<string> {
  if (!CLIENT_ID) throw new Error('Google Drive is not configured for this build.')
  if (hasLiveToken()) return accessToken as string

  // Google's token request can raise a sign-in popup even when asked to stay
  // quiet. A popup nobody asked for — on app open, say — is worse than a
  // backup that waits, so background callers stop here and the UI offers a
  // button instead.
  if (!interactive) throw new Error(NEEDS_SIGN_IN)

  const gis = await loadGis()
  return requestToken(gis, CLIENT_ID)
}

/** A previous grant means Google can usually reissue without a full prompt. */
function hasEverGranted(): boolean {
  try {
    // The token key is the fallback for devices that connected before the
    // grant was recorded on its own.
    return localStorage.getItem(GRANT_KEY) !== null || localStorage.getItem(TOKEN_KEY) !== null
  } catch {
    return false
  }
}

export function forgetToken(): void {
  const token = accessToken
  remember(null, 0)
  try {
    // Disconnecting is the one place the grant really is being given up.
    localStorage.removeItem(GRANT_KEY)
  } catch {
    // Nothing to clear.
  }
  if (token) window.google?.accounts.oauth2.revoke(token)
}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    remember(null, 0)
    throw new Error('Google sign-in expired. Connect again.')
  }
  if (!res.ok) throw new Error(`Drive returned ${res.status}. Try again in a moment.`)
  return res
}

/** The app's own backup file, if it has made one. */
export async function findBackup(token: string): Promise<RemoteFile | null> {
  const query = encodeURIComponent(`name = '${FILE_NAME}' and trashed = false`)
  const res = await call(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
  )
  const body = (await res.json()) as { files?: RemoteFile[] }
  return body.files?.[0] ?? null
}

export async function uploadBackup(
  token: string,
  contents: string,
  fileId?: string,
): Promise<RemoteFile> {
  const res = fileId
    ? await call(
        token,
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: contents },
      )
    : await call(
        token,
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
        {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=wt' },
          body: [
            '--wt',
            'Content-Type: application/json; charset=UTF-8',
            '',
            JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }),
            '--wt',
            'Content-Type: application/json',
            '',
            contents,
            '--wt--',
            '',
          ].join('\r\n'),
        },
      )
  return (await res.json()) as RemoteFile
}

export async function downloadBackup(token: string, fileId: string): Promise<string> {
  const res = await call(token, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`)
  return res.text()
}
