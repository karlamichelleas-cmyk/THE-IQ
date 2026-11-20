// Piezas visuales reutilizables
import type { ReactNode } from 'react'

export function MuestraPequena({ n }: { n: number }) {
  return (
    <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
      title={`n = ${n}: menos de 30 jugadas`}>
      muestra pequeña
    </span>
  )
}

export function Panel({ titulo, subtitulo, children, accion }: {
  titulo: string; subtitulo: string; children: ReactNode; accion?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-tight text-slate-900">
            <span className="inline-block h-6 w-1.5 rounded-sm bg-[#8B5CF6]" aria-hidden />{titulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

export function Tarjeta({ etiqueta, valor, detalle, aviso, color }: {
  etiqueta: string; valor: ReactNode; detalle: ReactNode; aviso?: ReactNode; color: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-[6px] bg-white p-5 shadow-sm" style={{ borderTopColor: color }}>
      <p className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-slate-600">
        <span className="inline-block h-4 w-1 rounded-sm bg-[#8B5CF6]" aria-hidden />{etiqueta}
      </p>
      <p className="mt-2 font-display text-5xl font-bold leading-tight text-slate-900">{valor}</p>
      <p className="mt-2 text-xs text-slate-400">{detalle}</p>
      {aviso ? <div className="mt-1">{aviso}</div> : null}
    </div>
  )
}

/** Etiqueta de color para la hoja de llamadas */
export function Etiqueta({ tono, children }: { tono: 'verde' | 'ambar' | 'rojo' | 'gris'; children: ReactNode }) {
  const estilos = {
    verde: 'bg-emerald-100 text-emerald-800 ring-emerald-600/30',
    ambar: 'bg-amber-100 text-amber-800 ring-amber-600/30',
    rojo: 'bg-rose-100 text-rose-800 ring-rose-600/30',
    gris: 'bg-slate-100 text-slate-600 ring-slate-400/30',
  }[tono]
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${estilos}`}>{children}</span>
}

export function Estado({ cargando, error }: { cargando: boolean; error: string | null }) {
  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudieron cargar los datos: {error}</p>
  if (cargando) return <p className="p-3 text-sm text-slate-500">Cargando…</p>
  return null
}

/** Tooltip claro y uniforme para todas las gráficas */
export function CajaAyuda({ titulo, lineas }: { titulo: string; lineas: ReactNode[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{titulo}</p>
      {lineas.map((l, i) => <p key={i} className="text-slate-600">{l}</p>)}
    </div>
  )
}
