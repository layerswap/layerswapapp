import { initFaro } from './lib/faro'

// Next.js loads this module before the application starts, giving Faro the
// earliest supported hook for console, runtime-error, and request tracing.
initFaro()
