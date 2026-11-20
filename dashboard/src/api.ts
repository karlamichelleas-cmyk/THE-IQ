// Tipos y llamadas a la API. Rutas relativas SIN diagonal inicial (la app vive en una subruta).
import { useEffect, useState } from 'react'

export type Intervalo = [number | null, number | null]

export interface Tendencia {
  x: number; n: number; bruta: number | null; media: number; ic90: Intervalo
  liga: number | null; muestra_pequena: boolean
}
export interface GrupoTendencias {
  etiqueta?: string; n: number; muestra_pequena: boolean
  formacion: Record<string, Tendencia>; personal: Record<string, Tendencia>; play_action: Tendencia
}
export interface TendenciasResp { rival: string; grupos: Record<string, GrupoTendencias>; total: GrupoTendencias }

export interface Predictibilidad { valor: number | null; ic95: Intervalo; n: number }
export interface EquipoFila { equipo: string; n: number; muestra_pequena: boolean; predictibilidad: Predictibilidad }
export interface EquiposResp { n_total: number; liga_predictibilidad: Predictibilidad; equipos: EquipoFila[] }

export interface Metrica { valor: number | null; ic95: Intervalo }
export interface Celda {
  cobertura: string; grupo?: string; tipo?: string; n: number; muestra_pequena: boolean
  yardas: Metrica; exito: Metrica; explosivas: Metrica; sack_int: Metrica; traslapa_con_mejor?: boolean
}
/** Éxito del rival contra una cobertura (escala 0-100), ajustado con Beta-Binomial */
export interface CoberturaRival {
  cobertura: string; x: number; n: number; bruta: number | null; media: number; ic90: Intervalo
  liga: number; n_liga: number; s: number; muestra_pequena: boolean
}
export interface LlamadaResp {
  rival: string; grupo: string; etiqueta: string
  que_esperar: {
    n: number; muestra_pequena: boolean
    formacion_mas_probable: Tendencia & { formacion: string }
    segunda_formacion: Tendencia & { formacion: string }
    play_action: Tendencia
  }
  que_llamar: {
    criterio: string; veredicto: string; etiqueta: string | null; excluidas: string[]
    fuente: 'rival' | 'liga' | null; min_n_rival: number
    liga: { exito: number | null; n: number }
    recomendada: CoberturaRival | null; evitar: CoberturaRival | null; coberturas: CoberturaRival[]
  }
}

export interface Diferencia { dif_por_100: number | null; ic95: Intervalo }
export interface Balance { n_5mas: number; n_estandar: number; sack_int: Diferencia; explosivas: Diferencia; muestra_pequena: boolean }
export interface PresionResp {
  ajustado_por_grupo: Balance
  grupos: Record<string, { etiqueta: string; balance: Balance }>
}

export interface ZonaCampo {
  zona: string; desde: number; hasta: number; red_zone: boolean; n: number; muestra_pequena: boolean
  exito: Metrica; liga: { valor: number | null; n: number }; diferencia: number | null
  formacion: { formacion: string | null; pct: number | null; n: number }
}
export interface CampoResp { rival: string; zonas: ZonaCampo[] }

export interface Filtros { cuarto: string; redzone: string; two_minute: string }

export const GRUPOS: Record<string, string> = {
  G1: '1er down',
  G2: '2do y corta-media (1-6)',
  G3: '2do y larga (7+)',
  G4: '3er/4to y corta (1-3)',
  G5: '3er/4to y media (4-6)',
  G6: '3er/4to y larga (7+)',
}

/** Arma la ruta relativa con los parámetros no vacíos. */
export function ruta(endpoint: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v) })
  const s = q.toString()
  return `api/${endpoint}${s ? `?${s}` : ''}`
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`)
  return r.json() as Promise<T>
}

/** Descarga una o varias rutas y las vuelve a pedir cuando cambian. */
export function useApi<T>(urls: string[]): { datos: T[] | null; error: string | null; cargando: boolean } {
  const [estado, setEstado] = useState<{ datos: T[] | null; error: string | null; cargando: boolean }>(
    { datos: null, error: null, cargando: true })
  const clave = urls.join('|')
  useEffect(() => {
    const control = new AbortController()
    setEstado(e => ({ ...e, cargando: true, error: null }))
    Promise.all(urls.map(u => getJson<T>(u, control.signal)))
      .then(datos => setEstado({ datos, error: null, cargando: false }))
      .catch(err => { if (!control.signal.aborted) setEstado({ datos: null, error: String(err.message ?? err), cargando: false }) })
    return () => control.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])
  return estado
}
