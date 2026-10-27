import { useMemo, type ReactNode } from 'react'
import { ChecksContext, checksOf } from './checks'

// A learning page being read: its checks report here, and count the
// reading once all are answered. Each new page starts over.
export function Reading({ slug, children }: { slug: string; children: ReactNode }) {
  const checks = useMemo(() => checksOf(slug), [slug])
  return <ChecksContext.Provider value={checks}>{children}</ChecksContext.Provider>
}
