/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * OAuth client ID from Google Cloud Console. Public by design for the
   * browser token flow. Unset means the Drive backup section stays hidden.
   */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
