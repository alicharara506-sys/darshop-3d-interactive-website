'use client'

import { useEffect } from 'react'

// QA page for checking a 3D model: /viewer?m=drill&a=40
export function ViewerClient() {
  useEffect(() => {
    import('@/viewer.js')
  }, [])

  return (
    <>
      <div id="l" style={{ position: 'fixed', top: 8, left: 8, font: '14px Arial' }} />
      <canvas id="c" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: -1 }} />
    </>
  )
}
