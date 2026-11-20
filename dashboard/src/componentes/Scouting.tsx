// Pestaña 1 · Scouting del rival
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ErrorBar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GRUPOS, ruta, useApi, type EquiposResp, type Filtros, type GrupoTendencias, type Tendencia, type TendenciasResp } from '../api'
import { icPct, nombreFormacion, num, pct } from '../formato'
import { Estado, MuestraPequena, Panel, Tarjeta } from './Comunes'

const AZUL = '#1e40af'
const GRIS = '#94a3b8'

/** La categoría con mayor media posterior */
function masProbable(d: Record<string, Tendencia>): [string, Tendencia] {
  return Object.entries(d).sort((a, b) => b[1].media - a[1].media)[0]
}

/** Color del mapa: más oscuro = más predecible (entropía baja) */
function colorPred(v: number | null): { fondo: string; texto: string } {
  if (v == null) return { fondo: '#f1f5f9', texto: '#475569' }
  const p = Math.max(0, Math.min(1, 1 - v))
  const mezcla = (a: number, b: number) => Math.round(a + (b - a) * p)
  const fondo = `rgb(${mezcla(239, 30)}, ${mezcla(246, 64)}, ${mezcla(255, 175)})`
  return { fondo, texto: p > 0.45 ? '#ffffff' : '#0f172a' }
}

export default function Scouting({ rival, filtros }: { rival: string; filtros: Filtros }) {
  const [grupo, setGrupo] = useState('G1')
  const f = { cuarto: filtros.cuarto, redzone: filtros.redzone, two_minute: filtros.two_minute }
  const tend = useApi<TendenciasResp>([ruta('tendencias', { rival, ...f })])
  const eqs = useApi<EquiposResp>([ruta('equipos', f), ...Object.keys(GRUPOS).map(g => ruta('equipos', { ...f, grupo: g }))])

  if (!tend.datos || !eqs.datos) return <Estado cargando={tend.cargando || eqs.cargando} error={tend.error ?? eqs.error} />
  const t = tend.datos[0]
  const [general, ...porGrupo] = eqs.datos
  const fila = general.equipos.find(e => e.equipo === rival)!
  const predGrupo = Object.fromEntries(Object.keys(GRUPOS).map((g, i) => [g, porGrupo[i].equipos.find(e => e.equipo === rival)!]))
  const [formTop, formTopT] = masProbable(t.total.formacion)
  const liga = general.liga_predictibilidad

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta etiqueta="Jugadas de pase analizadas" valor={fila.n.toLocaleString('es-MX')}
          detalle={`de ${general.n_total.toLocaleString('es-MX')} en la liga con estos filtros`}
          aviso={fila.muestra_pequena ? <MuestraPequena n={fila.n} /> : null} />
        <Tarjeta etiqueta="Predictibilidad (0 = siempre igual, 1 = impredecible)"
          valor={<>{num(fila.predictibilidad.valor, 2)} <span className="text-base font-normal text-slate-500">vs liga {num(liga.valor, 2)}</span></>}
          detalle={`IC 95%: ${num(fila.predictibilidad.ic95[0], 2)}–${num(fila.predictibilidad.ic95[1], 2)} · liga ${num(liga.ic95[0], 2)}–${num(liga.ic95[1], 2)}`} />
        <Tarjeta etiqueta="Formación más usada" valor={`${nombreFormacion(formTop)} ${pct(formTopT.media)}`}
          detalle={`IC 90%: ${icPct(formTopT.ic90)} · liga ${pct(formTopT.liga)} · n = ${formTopT.n}`}
          aviso={formTopT.muestra_pequena ? <MuestraPequena n={formTopT.n} /> : null} />
        <Tarjeta etiqueta="Play action" valor={pct(t.total.play_action.media)}
          detalle={`IC 90%: ${icPct(t.total.play_action.ic90)} · liga ${pct(t.total.play_action.liga)} · n = ${t.total.play_action.n}`}
          aviso={t.total.play_action.muestra_pequena ? <MuestraPequena n={t.total.play_action.n} /> : null} />
      </div>

      <Panel titulo="Mapa de situaciones"
        subtitulo="Color = predictibilidad de formaciones (más oscuro = más predecible). Cada celda: formación más probable, % y n. * = n < 30. Haz clic para ver el detalle.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(GRUPOS).map(([g, etiqueta]) => {
            const gt = t.grupos[g]
            const [form, ft] = masProbable(gt.formacion)
            const pred = predGrupo[g].predictibilidad.valor
            const c = colorPred(gt.n ? pred : null)
            const activo = g === grupo
            return (
              <button key={g} onClick={() => setGrupo(g)} style={{ background: c.fondo, color: c.texto }}
                className={`rounded-lg p-3 text-left transition ${activo ? 'ring-4 ring-amber-400' : 'ring-1 ring-slate-200 hover:ring-2 hover:ring-blue-300'}`}>
                <p className="text-xs font-semibold uppercase opacity-80">{etiqueta}</p>
                {gt.n ? (
                  <>
                    <p className="mt-2 text-lg font-bold">{nombreFormacion(form)} {pct(ft.media)}</p>
                    <p className="text-sm">n = {gt.n}{gt.n < 30 ? ' *' : ''}</p>
                    <p className="text-xs opacity-80">predictibilidad {num(pred, 2)}</p>
                  </>
                ) : <p className="mt-2 text-sm">sin jugadas</p>}
              </button>
            )
          })}
        </div>
      </Panel>

      <Detalle grupo={grupo} datos={t.grupos[grupo]} />
    </div>
  )
}

/** Filas para una gráfica de barras con intervalo: rival (media posterior) vs liga */
function filasGrafica(d: Record<string, Tendencia>, nombre: (k: string) => string) {
  return Object.entries(d).map(([k, v]) => ({
    nombre: nombre(k),
    rival: +(v.media * 100).toFixed(1),
    error: [+(v.media * 100 - (v.ic90[0] ?? v.media) * 100).toFixed(1), +((v.ic90[1] ?? v.media) * 100 - v.media * 100).toFixed(1)],
    liga: v.liga == null ? 0 : +(v.liga * 100).toFixed(1),
    n: v.n, x: v.x, ic: icPct(v.ic90),
  }))
}

type FilaGrafica = ReturnType<typeof filasGrafica>[number]

function Ayuda({ active, payload }: { active?: boolean; payload?: { payload: FilaGrafica }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-slate-200 bg-white p-2 text-xs shadow">
      <p className="font-semibold">{d.nombre}</p>
      <p>Rival: {d.rival}% (IC 90% {d.ic}) · {d.x} de {d.n}</p>
      <p>Liga: {d.liga}%</p>
    </div>
  )
}

function Barras({ filas, alto }: { filas: FilaGrafica[]; alto: number }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={filas} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" />
        <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 12 }} />
        <Tooltip content={<Ayuda />} />
        <Legend />
        <Bar dataKey="rival" name="Rival (media posterior, IC 90%)" fill={AZUL}>
          <ErrorBar dataKey="error" width={4} stroke="#0f172a" direction="x" />
        </Bar>
        <Bar dataKey="liga" name="Liga" fill={GRIS} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Detalle({ grupo, datos }: { grupo: string; datos: GrupoTendencias }) {
  const pa = filasGrafica({ 'Play action': datos.play_action }, k => k)
  return (
    <Panel titulo={`Tendencias en ${GRUPOS[grupo]}`}
      subtitulo={`Rival vs liga con el modelo Beta-Binomial (corrige muestras pequeñas). n = ${datos.n} jugadas.`}
      accion={datos.muestra_pequena ? <MuestraPequena n={datos.n} /> : null}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-medium text-slate-800">Formación</h3>
          <p className="mb-2 text-xs text-slate-500">% de jugadas en cada formación ofensiva.</p>
          <Barras filas={filasGrafica(datos.formacion, nombreFormacion)} alto={280} />
        </div>
        <div>
          <h3 className="font-medium text-slate-800">Personal</h3>
          <p className="mb-2 text-xs text-slate-500">% por agrupación de RB/TE/WR (las 5 más comunes de la liga; el resto en OTRO).</p>
          <Barras filas={filasGrafica(datos.personal, k => k)} alto={280} />
        </div>
        <div className="lg:col-span-2">
          <h3 className="font-medium text-slate-800">Play action</h3>
          <p className="mb-2 text-xs text-slate-500">% de jugadas con finta de carrera antes del pase.</p>
          <Barras filas={pa} alto={130} />
        </div>
      </div>
    </Panel>
  )
}
