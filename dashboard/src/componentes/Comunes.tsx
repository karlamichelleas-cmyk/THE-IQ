// Piezas visuales reutilizables
import type { ReactNode } from 'react'

export function MuestraPequena({ n }: { n: number }) {
  return (
    <span className="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
      title={`n = ${n}: menos de 30 jugadas`}>
      muestra pequeña
    </span>
  )
}

export function Panel({ titulo, subtitulo, children, accion }: {
  titulo: string; subtitulo: string; children: ReactNode; accion?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500">{subtitulo}</p>
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

export function Tarjeta({ etiqueta, valor, detalle, aviso }: {
  etiqueta: string; valor: ReactNode; detalle: ReactNode; aviso?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-blue-800">{valor}</p>
      <p className="mt-1 text-sm text-slate-600">{detalle}{aviso}</p>
    </div>
  )
}

export function Estado({ cargando, error }: { cargando: boolean; error: string | null }) {
  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudieron cargar los datos: {error}</p>
  if (cargando) return <p className="p-3 text-sm text-slate-500">Cargando…</p>
  return null
}
