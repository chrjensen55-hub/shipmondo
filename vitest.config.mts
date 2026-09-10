import path from 'path'
import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      // Next.js resolves the real `server-only` package (which only ships inside `next`'s own
      // bundle) via its webpack build; outside of that build (i.e. under Vitest) it must be
      // stubbed out so server-only library code can still be unit tested.
      'server-only': path.resolve(root, 'test/stubs/server-only.ts'),
      '@': path.resolve(root, 'src'),
    },
  },
})
