/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Empty string means same-origin (the composed stack). */
  readonly VITE_API_URL?: string;
  /** When "true", the dev server starts the MSW mock worker so the UI runs without a backend. */
  readonly VITE_ENABLE_MSW?: string;
  /** With VITE_ENABLE_MSW: when "true", seed a week of demo bookings (live demo, screenshots). */
  readonly VITE_MSW_DEMO_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
