// Pestaña 1 · Scouting del rival
import { useState, type CSSProperties } from 'react'
import { Bar, BarChart, ErrorBar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GRUPOS, ruta, useApi, type EquiposResp, type Filtros, type GrupoTendencias, type Tendencia, type TendenciasResp } from '../api'
import { colorEquipo } from '../equipos'
import { icPct, nombreFormacion, num, pct } from '../formato'
import Campo from './Campo'
import { CajaAyuda, Estado, MuestraPequena, Panel, Tarjeta } from './Comunes'

const GRIS_LIGA = '#94a3b8'
const EJE = { stroke: '#cbd5e1' }
const TICK = { fontSize: 12, fill: '#475569' }

/** La categoría con mayor media posterior */
function masProbable(d: Record<string, Tendencia>): [string, Tendencia] {
  return Object.entries(d).sort((a, b) => b[1].media - a[1].media)[0]
}

/** Color del mapa: verde = predecible (entropía baja), gris = impredecible */
function colorPred(v: number | null): { fondo: string; texto: string } {
  if (v == null) return { fondo: '#f1f5f9', texto: '#64748b' }
  const p = Math.max(0, Math.min(1, v))
  // de emerald-700 (#047857) a slate-200 (#e2e8f0)
  const mezcla = (a: number, b: number) => Math.round(a + (b - a) * p)
  const fondo = `rgb(${mezcla(4, 226)}, ${mezcla(120, 232)}, ${mezcla(87, 240)})`
  return { fondo, texto: p < 0.55 ? '#ffffff' : '#0f172a' }
}

export default function Scouting({ rival, filtros }: { rival: string; filtros: Filtros }) {
  const [grupo, setGrupo] = useState('G1')
  const color = colorEquipo(rival)
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta color={color} etiqueta="Jugadas de pase analizadas" valor={fila.n.toLocaleString('es-MX')}
          detalle={`de ${general.n_total.toLocaleString('es-MX')} en la liga con estos filtros`}
          aviso={fila.muestra_pequena ? <MuestraPequena n={fila.n} /> : null} />
        <Tarjeta color={color} etiqueta="Predictibilidad · 0 = siempre igual, 1 = impredecible"
          valor={<>{num(fila.predictibilidad.valor, 2)} <span className="text-base font-medium text-slate-400">vs liga {num(liga.valor, 2)}</span></>}
          detalle={`IC 95%: ${num(fila.predictibilidad.ic95[0], 2)}–${num(fila.predictibilidad.ic95[1], 2)} · liga ${num(liga.ic95[0], 2)}–${num(liga.ic95[1], 2)}`} />
        <Tarjeta color={color} etiqueta="Formación más usada" valor={<>{pct(formTopT.media)} <span className="text-base font-medium text-slate-500">{nombreFormacion(formTop)}</span></>}
          detalle={`IC 90%: ${icPct(formTopT.ic90)} · liga ${pct(formTopT.liga)} · n = ${formTopT.n}`}
          aviso={formTopT.muestra_pequena ? <MuestraPequena n={formTopT.n} /> : null} />
        <Tarjeta color={color} etiqueta="Play action" valor={pct(t.total.play_action.media)}
          detalle={`IC 90%: ${icPct(t.total.play_action.ic90)} · liga ${pct(t.total.play_action.liga)} · n = ${t.total.play_action.n}`}
          aviso={t.total.play_action.muestra_pequena ? <MuestraPequena n={t.total.play_action.n} /> : null} />
      </div>

      <Campo rival={rival} filtros={filtros} color={color} />

      <Panel titulo="Mapa de situaciones"
        subtitulo="Verde = predecible, gris = impredecible (entropía de formaciones). Cada celda: formación más probable, % y n; * = n < 30. Clic para ver el detalle.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(GRUPOS).map(([g, etiqueta]) => {
            const gt = t.grupos[g]
            const [form, ft] = masProbable(gt.formacion)
            const pred = predGrupo[g].predictibilidad.valor
            const c = colorPred(gt.n ? pred : null)
            const activo = g === grupo
            return (
              <button key={g} onClick={() => setGrupo(g)}
                style={{ background: c.fondo, color: c.texto, ['--tw-ring-color' as string]: color } as CSSProperties}
                className={`rounded-xl p-4 text-left shadow-sm transition ${activo ? 'ring-4 ring-offset-2' : 'ring-1 ring-black/5 hover:-translate-y-0.5 hover:shadow-md'}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">{etiqueta}</p>
                {gt.n ? (
                  <>
                    <p className="mt-3 text-2xl font-black">{pct(ft.media)}</p>
                    <p className="text-sm font-semibold">{nombreFormacion(form)}</p>
                    <p className="mt-2 text-xs opacity-90">n = {gt.n}{gt.n < 30 ? ' *' : ''} · pred. {num(pred, 2)}</p>
                  </>
                ) : <p className="mt-3 text-sm">sin jugadas</p>}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>predecible</span>
          <span className="h-2 w-40 rounded-full" style={{ background: 'linear-gradient(to right, #047857, #e2e8f0)' }} />
          <span>impredecible</span>
        </div>
      </Panel>

      <Detalle grupo={grupo} datos={t.grupos[grupo]} color={color} rival={rival} />
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

function Ayuda({ active, payload, rival }: { active?: boolean; payload?: { payload: FilaGrafica }[]; rival: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <CajaAyuda titulo={d.nombre} lineas={[`${rival}: ${d.rival}% (IC 90% ${d.ic})`, `${d.x} de ${d.n} jugadas`, `Liga: ${d.liga}%`]} />
}

function Barras({ filas, alto, color, rival }: { filas: FilaGrafica[]; alto: number; color: string; rival: string }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={filas} layout="vertical" margin={{ left: 10, right: 24 }} barGap={2}>
        <XAxis type="number" domain={[0, 100]} unit="%" axisLine={EJE} tickLine={false} tick={TICK} />
        <YAxis type="category" dataKey="nombre" width={150} axisLine={false} tickLine={false} tick={TICK} />
        <Tooltip content={<Ayuda rival={rival} />} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="rival" name={`${rival} (media posterior, IC 90%)`} fill={color} radius={[0, 4, 4, 0]}>
          <ErrorBar dataKey="error" width={4} stroke="#0f172a" direction="x" />
        </Bar>
        <Bar dataKey="liga" name="Liga" fill={GRIS_LIGA} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Detalle({ grupo, datos, color, rival }: { grupo: string; datos: GrupoTendencias; color: string; rival: string }) {
  const pa = filasGrafica({ 'Play action': datos.play_action }, k => k)
  return (
    <Panel titulo={`Tendencias en ${GRUPOS[grupo]}`}
      subtitulo={`${rival} vs liga con el modelo Beta-Binomial (corrige muestras pequeñas). n = ${datos.n} jugadas.`}
      accion={datos.muestra_pequena ? <MuestraPequena n={datos.n} /> : null}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Formación</h3>
          <p className="mb-2 text-xs text-slate-500">% de jugadas en cada formación ofensiva.</p>
          <Barras filas={filasGrafica(datos.formacion, nombreFormacion)} alto={280} color={color} rival={rival} />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Personal</h3>
          <p className="mb-2 text-xs text-slate-500">% por agrupación de RB/TE/WR (las 5 más comunes de la liga; el resto en OTRO).</p>
          <Barras filas={filasGrafica(datos.personal, k => k)} alto={280} color={color} rival={rival} />
        </div>
        <div className="lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Play action</h3>
          <p className="mb-2 text-xs text-slate-500">% de jugadas con finta de carrera antes del pase.</p>
          <Barras filas={pa} alto={130} color={color} rival={rival} />
        </div>
      </div>
    </Panel>
  )
}
