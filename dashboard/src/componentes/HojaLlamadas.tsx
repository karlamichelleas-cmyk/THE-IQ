// Pestaña 2 · Hoja de llamadas
import { Bar, BarChart, CartesianGrid, ErrorBar, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GRUPOS, ruta, useApi, type CoberturaRival, type Filtros, type LlamadaResp, type PresionResp } from '../api'
import { conSigno, icNum, icPct, nombreFormacion, num, pct } from '../formato'
import { Estado, MuestraPequena, Panel } from './Comunes'

/** "El rival tiene X% de éxito contra esta cobertura (n = Z) vs liga Y%" */
const porQue = (c: CoberturaRival, ll: LlamadaResp['que_llamar']) =>
  `El rival tiene ${num(c.media, 0)}% de éxito contra esta cobertura (n = ${c.n}) vs liga ${num(ll.liga.exito, 0)}%`

function QueLlamar({ ll }: { ll: LlamadaResp['que_llamar'] }) {
  const r = ll.recomendada
  if (!r) return <span className="text-slate-500">{ll.veredicto}</span>
  if (ll.fuente === 'liga') {
    // Sin datos suficientes del rival: recomendación de la liga, en gris
    return (
      <div className="text-slate-500">
        <p className="font-semibold">{r.cobertura}</p>
        <p className="text-xs">{ll.etiqueta}</p>
        <p className="text-xs">liga: {num(r.liga, 0)}% de éxito permitido</p>
      </div>
    )
  }
  const fuerte = ll.etiqueta === 'Recomendada'
  return (
    <div>
      <p className={`font-semibold ${fuerte ? 'text-blue-800' : 'text-slate-700'}`}>{r.cobertura}</p>
      <p className={`text-xs ${fuerte ? 'font-medium text-emerald-700' : 'text-slate-500'}`}>{ll.etiqueta}</p>
      <p className="text-xs text-slate-500">{num(r.media, 0)}% (IC 90% {num(r.ic90[0], 0)}–{num(r.ic90[1], 0)}%)</p>
      {r.muestra_pequena ? <MuestraPequena n={r.n} /> : null}
    </div>
  )
}

function Evitar({ ll }: { ll: LlamadaResp['que_llamar'] }) {
  const e = ll.evitar
  if (!e) return <span className="text-xs text-slate-500">—</span>
  return (
    <div>
      <p className="font-semibold text-rose-700">{e.cobertura}</p>
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
  return (
    <tr className="border-t border-slate-200 align-top">
      <td className="py-3 pr-4">
        <p className="font-semibold text-slate-900">{d.etiqueta}</p>
        <p className="text-xs text-slate-500">n = {e.n}</p>
        {e.muestra_pequena ? <MuestraPequena n={e.n} /> : null}
      </td>
      <td className="py-3 pr-4">
        {e.n ? (
          <>
            <p><span className="font-semibold">{nombreFormacion(f.formacion)}</span> {pct(f.media)} <span className="text-xs text-slate-500">(IC 90% {icPct(f.ic90)})</span></p>
            <p className="text-sm">Play action {pct(e.play_action.media)} <span className="text-xs text-slate-500">(IC 90% {icPct(e.play_action.ic90)}; liga {pct(e.play_action.liga)})</span></p>
          </>
        ) : <span className="text-slate-500">sin jugadas</span>}
      </td>
      <td className="py-3 pr-4"><QueLlamar ll={d.que_llamar} /></td>
      <td className="py-3 pr-4"><Evitar ll={d.que_llamar} /></td>
      <td className="py-3"><PorQue ll={d.que_llamar} /></td>
    </tr>
  )
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
      <h3 className="font-medium text-slate-800">Por situación</h3>
      <p className="mb-2 text-xs text-slate-500">Diferencia 5+ menos estándar en cada grupo, con IC 95% bootstrap. Las barras que cruzan 0 no muestran diferencia clara.</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={filas} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} />
          <YAxis unit="" label={{ value: 'por 100 pases', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#475569" />
          <Tooltip formatter={v => (typeof v === 'number' ? v.toFixed(1) : String(v ?? ''))} />
          <Legend />
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

  return (
    <div className="space-y-6">
      <section id="hoja-imprimible" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Hoja de llamadas · {rival}</h2>
            <p className="text-sm text-slate-500">
              Qué esperar: tendencias de {rival} (Beta-Binomial, IC 90%). Qué llamar: cobertura con menor % de éxito de {rival} (Beta-Binomial con la liga como prior, IC 90%); "Recomendada" si su IC queda por debajo del promedio de la liga. Red Zone y Goal Line solo con el filtro red zone. Filtros: {textoFiltros}.
            </p>
          </div>
          <button onClick={() => window.print()}
            className="no-imprimir shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Imprimir hoja
          </button>
        </div>
        {ll.datos ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="pb-2 pr-4">Situación</th><th className="pb-2 pr-4">Qué esperar</th><th className="pb-2 pr-4">Qué llamar</th><th className="pb-2 pr-4">Evitar</th><th className="pb-2">Por qué</th></tr>
            </thead>
            <tbody>{ll.datos.map(d => <Fila key={d.grupo} d={d} />)}</tbody>
          </table>
        ) : <Estado cargando={ll.cargando} error={ll.error} />}
        <p className="mt-3 text-xs text-slate-500">Solo jugadas de pase (el dataset no trae carreras). Éxito = 40% / 60% / 100% de las yardas por avanzar en 1er / 2do / 3er-4to down.</p>
      </section>
      {pr.datos ? <Presion datos={pr.datos[0]} /> : <Estado cargando={pr.cargando} error={pr.error} />}
    </div>
  )
}
