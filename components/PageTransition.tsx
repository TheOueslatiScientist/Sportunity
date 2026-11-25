'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle'>('idle')
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      // Scroll reset on page change
      try { window.scrollTo({ top: 0, behavior: 'instant' }) } catch {}
      setDisplayChildren(children)
      setTransitionStage('enter')
      const t = setTimeout(() => setTransitionStage('idle'), 220)
      return () => clearTimeout(t)
    } else {
      setDisplayChildren(children)
    }
  }, [pathname, children])

  return (
    <div
      className="h-full"
      style={{
        animation: transitionStage === 'enter'
          ? 'pageSlideIn 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'
          : undefined,
      }}
    >
      {displayChildren}
    </div>
  )
}
