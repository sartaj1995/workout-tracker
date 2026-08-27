import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Built on native <details>/<summary>: keyboard support, screen-reader
 * semantics and the open/closed state all come for free, with no JS.
 *
 * For things you reach for occasionally. Anything you use every session
 * belongs on the surface, not behind a tap.
 */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className="disclose" open={defaultOpen}>
      <summary>
        <span>{label}</span>
        <Icon name="chevronDown" size={18} className="disclose__chev" />
      </summary>
      <div className="disclose__body">{children}</div>
    </details>
  )
}
