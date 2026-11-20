// Pestaña 2 · Hoja de llamadas
import { Bar, BarChart, ErrorBar, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GRUPOS, ruta, useApi, type CoberturaRival, type Filtros, type LlamadaResp, type PresionResp } from '../api'
import { colorEquipo, nombreEquipo, textoSobre } from '../equipos'
import { conSigno, icNum, icPct, nombreFormacion, num, pct } from '../formato'
import { CajaAyuda, Estado, Etiqueta, MuestraPequena, Panel } from './Comunes'

const EJE = { stroke: '#cbd5e1' }
const TICK = { fontSize: 11, fill: '#475569' }

/** "El rival tiene X% de éxito contra esta cobertura (n = Z) vs liga Y%" */
const porQue = (c: CoberturaRival, ll: LlamadaResp['que_llamar']) =>
  `El rival tiene ${num(c.media, 0)}% de éxito contra esta cobertura (n = ${c.n}) vs liga ${num(ll.liga.exito, 0)}%`

function QueLlamar({ ll }: { ll: LlamadaResp['que_llamar'] }) {
  const r = ll.recomendada
  if (!r) return <span className="text-slate-500">{ll.veredicto}</span>
  if (ll.fuente === 'liga') {
    // Sin datos suficientes del rival: recomendación de la liga, en gris
    return (
      <div className="space-y-1 text-slate-500">
        <Etiqueta tono="gris">{ll.etiqueta}</Etiqueta>
        <p className="text-base font-bold">{r.cobertura}</p>
        <p className="text-xs">liga: {num(r.liga, 0)}% de éxito permitido</p>
      </div>
    )
  }
  const fuerte = ll.etiqueta === 'Recomendada'
  return (
    <div className="space-y-1">
      <Etiqueta tono={fuerte ? 'verde' : 'ambar'}>{ll.etiqueta}</Etiqueta>
      <p className="text-base font-bold text-slate-900">{r.cobertura}</p>
      <p className="text-xs text-slate-500">{num(r.media, 0)}% (IC 90% {num(r.ic90[0], 0)}–{num(r.ic90[1], 0)}%)</p>
      {r.muestra_pequena ? <MuestraPequena n={r.n} /> : null}
    </div>
  )
}

function Evitar({ ll }: { ll: LlamadaResp['que_llamar'] }) {
  const e = ll.evitar
  if (!e) return <span className="text-xs text-slate-400">—</span>
  return (
    <div className="space-y-1">
      <Etiqueta tono="rojo">Evitar</Etiqueta>
      <p className="text-base font-bold text-slate-900">{e.cobertura}</p>
      <p className="text-xs text-slate-500">{num(e.media, 0)}% (IC 90% {num(e.ic90[0], 0)}–{num(e.ic90[1], 0)}%)</p>
      {e.muestra_pequena ? <MuestraPequena n={e.n} /> : null}
    </div>
  )
}

function PorQue({ ll }: { ll: LlamadaResp['que_llamar'] }) {
  const r = ll.recomendada
  if (!r) return <span className="text-xs text-slate-500">Ninguna cobertura con n ≥ 30 en la liga en esta situación.</span>
  if (ll.fuente === 'liga') {
    return (
      <p className="text-xs text-slate-500">
        La liga permite {num(r.liga, 0)}% de éxito contra esta cobertura vs liga {num(ll.liga.exito, 0)}%.
        El rival tiene n = {r.n} contra ella (ninguna cobertura con n ≥ {ll.min_n_rival} del rival).
      </p>
    )
  }
  return (
    <div className="text-xs text-slate-700">
      <p>{porQue(r, ll)}.</p>
      {ll.evitar ? <p className="text-slate-500">Evitar {ll.evitar.cobertura}: {porQue(ll.evitar, ll)}.</p> : null}
    </div>
  )
}

function Fila({ d }: { d: LlamadaResp }) {
  const e = d.que_esperar
  const f = e.formacion_mas_probable
  const celda = 'px-4 py-4 align-top'
  return (
    <tr className="border-b border-slate-200 odd:bg-white even:bg-slate-50">
      <td className={`${celda} w-44`}>
        <p className="font-bold uppercase tracking-wide text-slate-900">{d.etiqueta}</p>
        <p className="mt-1 text-xs text-slate-500">n = {e.n}</p>
        {e.muestra_pequena ? <MuestraPequena n={e.n} /> : null}
      </td>
      <td className={celda}>
        {e.n ? (
          <>
            <p className="text-base"><span className="font-bold">{nombreFormacion(f.formacion)}</span> {pct(f.media)}</p>
            <p className="text-xs text-slate-500">IC 90% {icPct(f.ic90)}</p>
            <p className="mt-1.5 text-sm">Play action <span className="font-semibold">{pct(e.play_action.media)}</span></p>
            <p className="text-xs text-slate-500">IC 90% {icPct(e.play_action.ic90)} · liga {pct(e.play_action.liga)}</p>
          </>
        ) : <span className="text-slate-500">sin jugadas</span>}
      </td>
      <td className={`${celda} border-l-4 border-l-emerald-500/40`}><QueLlamar ll={d.que_llamar} /></td>
      <td className={`${celda} border-l-4 border-l-rose-500/40`}><Evitar ll={d.que_llamar} /></td>
      <td className={`${celda} max-w-xs`}><PorQue ll={d.que_llamar} /></td>
    </tr>
  )
}

interface FilaPresion { nombre: string; sack: number; sackErr: number[]; expl: number; explErr: number[]; n5: number; nstd: number }

function AyudaPresion({ active, payload }: { active?: boolean; payload?: { payload: FilaPresion }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const ic = (v: number, e: number[]) => `${(v - e[0]).toFixed(1)} a ${(v + e[1]).toFixed(1)}`
  return <CajaAyuda titulo={d.nombre} lineas={[
    `Sacks/INT: ${conSigno(d.sack)} por 100 pases (IC 95% ${ic(d.sack, d.sackErr)})`,
    `Explosivas: ${conSigno(d.expl)} por 100 pases (IC 95% ${ic(d.expl, d.explErr)})`,
    `n = ${d.n5} con 5+ · ${d.nstd} estándar`,
  ]} />
}

function Presion({ datos }: { datos: PresionResp }) {
  const a = datos.ajustado_por_grupo
  const filas = Object.entries(datos.grupos).map(([, g]) => {
    const s = g.balance.sack_int, x = g.balance.explosivas
    const err = (d: typeof s) => [d.dif_por_100 == null || d.ic95[0] == null ? 0 : d.dif_por_100 - d.ic95[0], d.dif_por_100 == null || d.ic95[1] == null ? 0 : d.ic95[1] - d.dif_por_100]
    return {
      nombre: g.etiqueta, sack: s.dif_por_100 ?? 0, sackErr: err(s), expl: x.dif_por_100 ?? 0, explErr: err(x),
      n5: g.balance.n_5mas, nstd: g.balance.n_estandar,
    }
  })
  return (
    <Panel titulo="¿Presionar o no?"
      subtitulo="Mandar 5+ rushers vs presión estándar (≤ 4), toda la liga, por cada 100 pases. Positivo = más con 5+.">
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase text-emerald-800">Sacks + intercepciones ganados</p>
          <p className="text-3xl font-bold text-emerald-800">{conSigno(a.sack_int.dif_por_100)} <span className="text-base font-normal">por cada 100 pases</span></p>
          <p className="text-sm text-emerald-900">IC 95%: {icNum(a.sack_int.ic95)} · ajustado por situación</p>
        </div>
        <div className="rounded-lg bg-rose-50 p-4">
          <p className="text-xs font-medium uppercase text-rose-800">Explosivas (20+ yd) permitidas</p>
          <p className="text-3xl font-bold text-rose-800">{conSigno(a.explosivas.dif_por_100)} <span className="text-base font-normal">por cada 100 pases</span></p>
          <p className="text-sm text-rose-900">IC 95%: {icNum(a.explosivas.ic95)} · n = {a.n_5mas.toLocaleString('es-MX')} con 5+ y {a.n_estandar.toLocaleString('es-MX')} estándar</p>
        </div>
      </div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Por situación</h3>
      <p className="mb-2 text-xs text-slate-500">Diferencia 5+ menos estándar en cada grupo, con IC 95% bootstrap. Las barras que cruzan 0 no muestran diferencia clara.</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={filas} margin={{ left: 0, right: 10 }}>
          <XAxis dataKey="nombre" tick={TICK} interval={0} axisLine={EJE} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tick={TICK}
            label={{ value: 'por 100 pases', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} />
          <ReferenceLine y={0} stroke="#475569" />
          <Tooltip cursor={{ fill: '#f1f5f9' }} content={<AyudaPresion />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sack" name="Sacks/INT ganados" fill="#059669">
            <ErrorBar dataKey="sackErr" width={4} stroke="#064e3b" />
          </Bar>
          <Bar dataKey="expl" name="Explosivas permitidas" fill="#e11d48">
            <ErrorBar dataKey="explErr" width={4} stroke="#881337" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}

export default function HojaLlamadas({ rival, filtros }: { rival: string; filtros: Filtros }) {
  const f = { cuarto: filtros.cuarto, redzone: filtros.redzone, two_minute: filtros.two_minute }
  const ll = useApi<LlamadaResp>(Object.keys(GRUPOS).map(g => ruta('llamada', { rival, grupo: g, ...f })))
  const pr = useApi<PresionResp>([ruta('presion', f)])
  const textoFiltros = [
    filtros.cuarto && `cuarto ${filtros.cuarto}`,
    filtros.redzone === 'true' && 'solo red zone', filtros.redzone === 'false' && 'sin red zone',
    filtros.two_minute === 'true' && 'solo two-minute', filtros.two_minute === 'false' && 'sin two-minute',
  ].filter(Boolean).join(' · ') || 'todas las jugadas'

  const color = colorEquipo(rival)
  const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider'

  return (
    <div className="space-y-8">
      <section id="hoja-imprimible" className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
        {/* Encabezado de la hoja, con el color del rival */}
        <div className="flex items-stretch justify-between gap-4 border-b-4" style={{ borderBottomColor: color }}>
          <div className="flex items-stretch">
            <div className="flex w-24 items-center justify-center text-2xl font-black tracking-wider"
              style={{ background: color, color: textoSobre(color) }}>{rival}</div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#6D28D9]">Hoja de llamadas · defensa</p>
              <h2 className="flex items-center gap-2.5 font-display text-3xl font-bold uppercase tracking-tight text-slate-900">
                <span className="inline-block h-7 w-1.5 rounded-sm bg-[#8B5CF6]" aria-hidden />{nombreEquipo(rival)}
              </h2>
              <p className="mt-1 text-xs text-slate-500">Filtros: {textoFiltros}</p>
            </div>
          </div>
          <div className="flex items-center pr-5">
            <button onClick={() => window.print()}
              className="no-imprimir rounded-full bg-[#6D28D9] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-[#5B21B6]">
              Imprimir hoja
            </button>
          </div>
        </div>
        {ll.datos ? (
          <table className="w-full text-sm">
            <thead className="bg-[#2E1065] text-white">
              <tr>
                <th className={th}>Situación</th><th className={th}>Qué esperar</th><th className={th}>Qué llamar</th>
                <th className={th}>Evitar</th><th className={th}>Por qué</th>
              </tr>
            </thead>
            <tbody>{ll.datos.map(d => <Fila key={d.grupo} d={d} />)}</tbody>
          </table>
        ) : <div className="p-5"><Estado cargando={ll.cargando} error={ll.error} /></div>}
        <div className="space-y-1 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
          <p>
            Qué esperar: tendencias de {rival} (Beta-Binomial, IC 90%). Qué llamar: cobertura con menor % de éxito de {rival} (Beta-Binomial con la liga como prior, IC 90%); "Recomendada" si su IC queda por debajo del promedio de la liga. Red Zone y Goal Line solo con el filtro red zone.
          </p>
          <p>Solo jugadas de pase (el dataset no trae carreras). Éxito = 40% / 60% / 100% de las yardas por avanzar en 1er / 2do / 3er-4to down.</p>
        </div>
      </section>
      <div className="no-imprimir">
        {pr.datos ? <Presion datos={pr.datos[0]} /> : <Estado cargando={pr.cargando} error={pr.error} />}
      </div>
    </div>
  )
}
