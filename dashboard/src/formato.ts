// Formato de números y nombres para la interfaz
import type { Intervalo } from './api'

export const NOMBRE_FORMACION: Record<string, string> = {
  SHOTGUN: 'Shotgun', EMPTY: 'Empty', SINGLEBACK: 'Singleback', I_FORM: 'I-Form', PISTOL: 'Pistol', OTRA: 'Otra (Jumbo/Wildcat)',
}

export const nombreFormacion = (f: string) => NOMBRE_FORMACION[f] ?? f

/** Proporción 0-1 → "42%" */
export const pct = (v: number | null | undefined, dec = 0) => (v == null ? '—' : `${(v * 100).toFixed(dec)}%`)

/** Intervalo de proporciones 0-1 → "35–49%" */
export const icPct = (ic: Intervalo) => (ic[0] == null || ic[1] == null ? '—' : `${(ic[0] * 100).toFixed(0)}–${(ic[1] * 100).toFixed(0)}%`)

/** Número ya en escala → "1.8" */
export const num = (v: number | null | undefined, dec = 1) => (v == null ? '—' : v.toFixed(dec))

/** Intervalo ya en escala → "0.7 a 3.9" */
export const icNum = (ic: Intervalo, dec = 1) => (ic[0] == null || ic[1] == null ? '—' : `${ic[0].toFixed(dec)} a ${ic[1].toFixed(dec)}`)

/** Signo explícito: +2.2 / −1.0 */
export const conSigno = (v: number | null, dec = 1) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(dec)}`)
