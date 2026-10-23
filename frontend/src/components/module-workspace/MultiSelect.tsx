/**
 * Multi-select styled like the original's react-select usage
 * (isMulti, closeMenuOnSelect=false, hideSelectedOptions=false, menu portalled to body,
 *  custom MultiValue badge = first value + "+N" bubble, Option = checkbox + label).
 * react-select isn't a dependency, so this reproduces its default DOM/styles plus the original overrides.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type MultiOption = { value: string; label: string; isDisabled?: boolean }

/** Original "Po": sectionFieldOptions -> react-select options. */
export function mapFieldOptions(options: { fieldOption: unknown }[] = []): MultiOption[] {
  return options.flatMap((o) => (typeof o.fieldOption === 'string' ? [{ value: o.fieldOption, label: o.fieldOption }] : []))
}

type Props = {
  value: MultiOption[]
  options: MultiOption[]
  onChange: (next: MultiOption[]) => void
  isDisabled?: boolean
  className?: string
  /** control width override (original: 180px when "Any Other" is selected) */
  controlStyle?: CSSProperties
  placeholder?: string
}

const GREY = 'hsl(0, 0%, 80%)'

function Chevron() {
  return (
    <svg height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false" style={{ display: 'inline-block', fill: 'currentColor', lineHeight: 1, stroke: 'currentColor', strokeWidth: 0 }}>
      <path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z" />
    </svg>
  )
}
function Cross() {
  return (
    <svg height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false" style={{ display: 'inline-block', fill: 'currentColor', lineHeight: 1, stroke: 'currentColor', strokeWidth: 0 }}>
      <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" />
    </svg>
  )
}

export default function MultiSelect({ value, options, onChange, isDisabled = false, className, controlStyle, placeholder = 'Select...' }: Props) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState<number>(-1)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const controlRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => new Set(value.map((v) => v.value)), [value])
  const visible = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase())), [options, search])

  const place = () => controlRef.current && setRect(controlRef.current.getBoundingClientRect())
  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!controlRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggle = (o: MultiOption) => {
    if (o.isDisabled) return
    onChange(selected.has(o.value) ? value.filter((v) => v.value !== o.value) : [...value, o])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setFocused((f) => Math.min(visible.length - 1, f + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused((f) => Math.max(0, f - 1))
    } else if (e.key === 'Enter' && open && visible[focused]) {
      e.preventDefault()
      toggle(visible[focused])
    } else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Backspace' && !search && value.length) onChange(value.slice(0, -1))
  }

  // spaceBelow < 300 -> open upwards (menuPlacement="auto")
  const up = rect ? window.innerHeight - rect.bottom < 300 && rect.top > window.innerHeight - rect.bottom : false

  return (
    <div className={cn('relative', className, isDisabled && 'pointer-events-none')} style={{ boxSizing: 'border-box' }}>
      <div
        ref={controlRef}
        className="select__control"
        onMouseDown={(e) => {
          if (isDisabled) return
          if (e.target !== inputRef.current) e.preventDefault()
          setOpen((o) => !o)
          inputRef.current?.focus()
        }}
        style={{
          alignItems: 'center',
          cursor: 'default',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          minHeight: 38,
          outline: 0,
          position: 'relative',
          transition: 'all 100ms',
          backgroundColor: isDisabled ? 'hsl(0, 0%, 95%)' : 'white',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: 4,
          borderStyle: 'solid',
          borderWidth: 1,
          boxShadow: 'none',
          boxSizing: 'border-box',
          ...controlStyle,
        }}
      >
        <div className="select__value-container" style={{ alignItems: 'center', display: 'flex', flex: 1, flexWrap: 'wrap', padding: '2px 8px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
          {!value.length && !search && (
            <div className="select__placeholder" style={{ gridArea: '1 / 1 / 2 / 3', color: 'hsl(0, 0%, 50%)', marginLeft: 2, marginRight: 2, boxSizing: 'border-box' }}>
              {placeholder}
            </div>
          )}
          {value[0] && (
            <div
              className="select__multi-value bg-[#21496B] max-w-[60px]"
              style={{ display: 'flex', minWidth: 0, margin: 2, backgroundColor: '#f9f9f9', borderRadius: 12, padding: '0 6px', height: 24, alignItems: 'center', fontSize: 12, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' }}
            >
              <div style={{ borderRadius: 2, color: 'white', fontSize: '85%', overflow: 'hidden', padding: 3, paddingLeft: 6, textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{value[0].label}</div>
            </div>
          )}
          {value.length > 1 && (
            <div className="bg-[#636363] rounded-full text-xs flex items-center justify-center h-[24px] w-[24px] text-white">+{value.length - 1}</div>
          )}
          <div style={{ visibility: 'visible', flex: '1 1 auto', display: 'inline-grid', gridArea: '1 / 1 / 2 / 3', gridTemplateColumns: '0 min-content', margin: 2, paddingBottom: 2, paddingTop: 2, color: 'hsl(0, 0%, 20%)', boxSizing: 'border-box' }}>
            <input
              ref={inputRef}
              value={search}
              disabled={isDisabled}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              style={{ color: 'inherit', background: 0, opacity: 1, width: '100%', gridArea: '1 / 2', font: 'inherit', minWidth: 2, border: 0, margin: 0, outline: 0, padding: 0 }}
            />
          </div>
        </div>
        <div className="select__indicators" style={{ alignItems: 'center', alignSelf: 'stretch', display: 'flex', flexShrink: 0, boxSizing: 'border-box' }}>
          {value.length > 0 && (
            <div
              aria-hidden="true"
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onChange([])
              }}
              style={{ color: GREY, display: 'flex', padding: 8, transition: 'color 150ms', boxSizing: 'border-box' }}
            >
              <Cross />
            </div>
          )}
          <span style={{ alignSelf: 'stretch', width: 1, backgroundColor: GREY, marginBottom: 8, marginTop: 8, boxSizing: 'border-box' }} />
          <div aria-hidden="true" style={{ color: GREY, display: 'flex', padding: 8, transition: 'color 150ms', boxSizing: 'border-box' }}>
            <Chevron />
          </div>
        </div>
      </div>
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            className="select__menu"
            style={{
              position: 'fixed',
              left: rect.left,
              width: rect.width,
              ...(up ? { bottom: window.innerHeight - rect.top } : { top: rect.bottom }),
              zIndex: 9999,
              backgroundColor: 'white',
              borderRadius: 4,
              boxShadow: '0 0 0 1px hsla(0, 0%, 0%, 0.1), 0 4px 11px hsla(0, 0%, 0%, 0.1)',
              margin: '8px 0',
              boxSizing: 'border-box',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="select__menu-list" style={{ maxHeight: 300, overflowY: 'auto', paddingBottom: 4, paddingTop: 4, position: 'relative', boxSizing: 'border-box' }}>
              {visible.length === 0 ? (
                <div style={{ color: 'hsl(0, 0%, 60%)', padding: '8px 12px', textAlign: 'center' }}>No options</div>
              ) : (
                visible.map((o, i) => (
                  <div
                    key={o.value}
                    className="select__option"
                    aria-disabled={o.isDisabled}
                    onMouseEnter={() => setFocused(i)}
                    onClick={() => toggle(o)}
                    style={{ backgroundColor: focused === i ? '#e5f4ff' : 'white', color: 'black', padding: '8px 12px', cursor: 'pointer', display: 'block', fontSize: 'inherit', width: '100%', userSelect: 'none', boxSizing: 'border-box' }}
                  >
                    <div className="flex items-center gap-2 ">
                      <input type="checkbox" checked={selected.has(o.value)} readOnly className="p-2 text-blue-600" />
                      <span className="text-xs ">{o.label}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
