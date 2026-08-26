import { useEffect, useRef, useState, type ReactNode } from 'react'

interface NumberFieldProps {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  caption?: string
  step?: number
  small?: boolean
}

/**
 * Numeric input that tolerates half-typed values ("22." while you reach for 5)
 * and shows last session's number as a ghost you can just accept.
 */
export function NumberField({ value, onChange, placeholder, caption, step = 0.5 }: NumberFieldProps) {
  const [text, setText] = useState(value === null ? '' : String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(value === null ? '' : String(value))
  }, [value])

  return (
    <div className="field">
      {caption ? <span className="cap">{caption}</span> : null}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          focused.current = true
          e.currentTarget.select()
        }}
        onBlur={() => {
          focused.current = false
          setText(value === null ? '' : String(value))
        }}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          if (raw.trim() === '') {
            onChange(null)
            return
          }
          const n = Number(raw)
          if (Number.isFinite(n)) onChange(n)
        }}
      />
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  )
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
