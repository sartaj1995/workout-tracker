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

let accessToken: string | null = null
let expiresAt = 0

export function hasLiveToken(): boolean {
  return Boolean(accessToken) && Date.now() < expiresAt - 60_000
}

/**
 * `interactive` shows Google's account chooser. Without it the browser tries to
 * reissue a token silently, which usually works but is blocked often enough on
 * iOS Safari that every caller needs an interactive fallback.
 */
export async function authorise(interactive: boolean): Promise<string> {
  if (!CLIENT_ID) throw new Error('Google Drive is not configured for this build.')
  if (hasLiveToken()) return accessToken as string

  const gis = await loadGis()
  return new Promise<string>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Google did not return a token.'))
          return
        }
        accessToken = response.access_token
        expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000
        resolve(accessToken)
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
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

export function forgetToken(): void {
  const token = accessToken
  accessToken = null
  expiresAt = 0
  if (token) window.google?.accounts.oauth2.revoke(token)
}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    accessToken = null
    expiresAt = 0
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
