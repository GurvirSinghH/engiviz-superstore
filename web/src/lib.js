import { useEffect, useRef, useState } from 'react'

export function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width)
      setWidth((prev) => (prev === w ? prev : w))
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

export function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('in')
          io.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

const MINUS = '−'

/** $2.30M, $286K, $135.4K, $3,702 */
export function money(v, { sign = false, digits } = {}) {
  const a = Math.abs(v)
  let s
  if (a >= 1e6) s = `$${(a / 1e6).toFixed(digits ?? 2)}M`
  else if (a >= 1e3) s = `$${(a / 1e3).toFixed(digits ?? (a >= 100e3 ? 0 : 1))}K`
  else s = `$${a.toFixed(digits ?? 0)}`
  if (v < 0) return MINUS + s
  return sign && v > 0 ? '+' + s : s
}
export function moneyFull(v) {
  const s = '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v < 0 ? MINUS + s : s
}
export function pct(v, digits = 1, { sign = false } = {}) {
  const s = `${Math.abs(v * 100).toFixed(digits)}%`
  if (v < 0 && Math.abs(v * 100).toFixed(digits) !== (0).toFixed(digits)) return MINUS + s
  return sign && v > 0 ? '+' + s : s
}
export const discLabel = (d) => `${Math.round(d * 100)}%`

export const PALETTES = {
  light: {
    ink: '#0b0b0b', ink2: '#52514e', muted: '#7a7872', grid: '#e1e0d9', axis: '#c3c2b7', surface: '#fcfcfb',
    profit: '#2a78d6', loss: '#e34948', lossSoft: '#f0a8a7', wash: 'rgba(227,73,72,0.07)',
    disc: ['#efede7', '#d6d3ca', '#9d998f', '#2f2d29'], empty: 'transparent', dotAlpha: 0.62,
  },
  dark: {
    ink: '#ffffff', ink2: '#c3c2b7', muted: '#8f8d86', grid: '#2c2c2a', axis: '#383835', surface: '#1a1a19',
    profit: '#3987e5', loss: '#e66767', lossSoft: '#8a4444', wash: 'rgba(230,103,103,0.10)',
    disc: ['#252523', '#3c3b38', '#7c7a73', '#e8e5da'], empty: 'transparent', dotAlpha: 0.45,
  },
}
