/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Empty string means same-origin (the composed stack). */
  readonly VITE_API_URL?: string;
  /** When "true", the dev server starts the MSW mock worker so the UI runs without a backend. */
  readonly VITE_ENABLE_MSW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
