import type { ReactNode } from 'react'

export type BubblePosition = 'top' | 'bottom' | 'start' | 'end'

export function MascotBubble({ children, position = 'end' }: { children: ReactNode; position?: BubblePosition }) {
  return <div className="mascot-bubble" data-position={position}>{children}</div>
}
