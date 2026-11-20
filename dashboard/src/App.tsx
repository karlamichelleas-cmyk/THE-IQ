// "Leer al rival": scouting y hoja de llamadas para el coach defensivo
import { useEffect, useState } from 'react'
import { ruta, useApi, type EquiposResp, type Filtros } from './api'
import HojaLlamadas from './componentes/HojaLlamadas'
import Scouting from './componentes/Scouting'
import { colorEquipo, nombreEquipo, textoSobre } from './equipos'

// Paleta morada: encabezado en degradado, acentos y botones activos
const ENCABEZADO = 'linear-gradient(90deg, #2E1065 0%, #4C1D95 100%)'

/** Grupo de botones tipo "pill"; el activo va resaltado */
function Pills({ etiqueta, valor, onChange, opciones }: {
  etiqueta: string; valor: string; onChange: (v: string) => void; opciones: [string, string][]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{etiqueta}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={etiqueta}>
        {opciones.map(([v, t]) => {
          const activo = v === valor
          return (
            <button key={v || 'todos'} onClick={() => onChange(v)} aria-pressed={activo}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${activo
                ? 'bg-[#6D28D9] text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SI_NO: [string, string][] = [['', 'Todas'], ['true', 'Solo'], ['false', 'Excluir']]
const CUARTOS: [string, string][] = [['', 'Todos'], ['Q1', '1º'], ['Q2', '2º'], ['Q3', '3º'], ['Q4', '4º'], ['Tiempo extra', 'T. extra']]

export default function App() {
  const equipos = useApi<EquiposResp>([ruta('equipos', {})])
  const [rival, setRival] = useState('')
  const [pestana, setPestana] = useState<'scouting' | 'hoja'>('scouting')
  const [filtros, setFiltros] = useState<Filtros>({ cuarto: '', redzone: '', two_minute: '' })
  const lista = equipos.datos?.[0].equipos.map(e => e.equipo) ?? []

  // Primer rival de la lista por defecto
  useEffect(() => { if (!rival && lista.length) setRival(lista[0]) }, [lista, rival])

  const cambiar = (k: keyof Filtros) => (v: string) => setFiltros(f => ({ ...f, [k]: v }))
  const color = colorEquipo(rival)

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      <header className="no-imprimir text-white" style={{ background: ENCABEZADO }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 pt-6 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B5CF6]">NFL · Scouting defensivo</p>
            <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-none tracking-tight">Leer al rival</h1>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.15em] text-violet-200">
              Reporte de scouting defensivo · NFL 2021 · Semanas 1-8
            </p>
          </div>
          {/* Rival seleccionado, con franja de su color */}
          <div className="flex items-stretch overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/15">
            <div className="w-2.5" style={{ background: color }} />
            <div className="px-4 py-2">
              <label htmlFor="rival" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Rival (ataque)</label>
              <select id="rival" value={rival} onChange={e => setRival(e.target.value)} disabled={!lista.length}
                className="cursor-pointer bg-transparent pr-2 text-3xl font-black tracking-wide text-white focus:outline-none">
                {lista.map(eq => <option key={eq} value={eq} className="text-base text-slate-900">{eq}</option>)}
              </select>
              <p className="text-xs text-slate-300">{rival ? nombreEquipo(rival) : ''}</p>
            </div>
            <div className="flex w-16 items-center justify-center text-lg font-black" style={{ background: color, color: textoSobre(color) }}>
              {rival}
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {([['scouting', 'Scouting del rival'], ['hoja', 'Hoja de llamadas']] as const).map(([k, t]) => (
            <button key={k} onClick={() => setPestana(k)}
              className={`rounded-t-lg px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-wide transition ${pestana === k
                ? 'bg-[#6D28D9] text-white' : 'text-violet-200 hover:bg-white/10 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {/* Barra de filtros */}
      <div className="no-imprimir sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-6 py-3">
          <Pills etiqueta="Cuarto" valor={filtros.cuarto} onChange={cambiar('cuarto')} opciones={CUARTOS} />
          <Pills etiqueta="Red zone (≤ 20 yd)" valor={filtros.redzone} onChange={cambiar('redzone')} opciones={SI_NO} />
          <Pills etiqueta="Two-minute drill" valor={filtros.two_minute} onChange={cambiar('two_minute')} opciones={SI_NO} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {equipos.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudo conectar con la API: {equipos.error}</p>}
        {rival && (pestana === 'scouting'
          ? <Scouting rival={rival} filtros={filtros} />
          : <HojaLlamadas rival={rival} filtros={filtros} />)}
      </main>

      <footer className="no-imprimir border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-7xl px-6 py-4 text-xs text-slate-500">
          Datos: NFL Big Data Bowl · Solo jugadas de pase · Estimaciones con intervalos de confianza
        </p>
      </footer>
    </div>
  )
}
