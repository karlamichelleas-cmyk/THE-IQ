// "Leer al rival": scouting y hoja de llamadas para el coach defensivo
import { useEffect, useState } from 'react'
import { ruta, useApi, type EquiposResp, type Filtros } from './api'
import HojaLlamadas from './componentes/HojaLlamadas'
import Scouting from './componentes/Scouting'

const SELECT = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Filtro({ etiqueta, valor, onChange, opciones }: {
  etiqueta: string; valor: string; onChange: (v: string) => void; opciones: [string, string][]
}) {
  return (
    <label className="flex flex-col text-xs font-medium text-slate-600">
      {etiqueta}
      <select className={`mt-1 ${SELECT}`} value={valor} onChange={e => onChange(e.target.value)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

const SI_NO: [string, string][] = [['', 'Todas'], ['true', 'Solo sí'], ['false', 'Excluir']]

export default function App() {
  const equipos = useApi<EquiposResp>([ruta('equipos', {})])
  const [rival, setRival] = useState('')
  const [pestana, setPestana] = useState<'scouting' | 'hoja'>('scouting')
  const [filtros, setFiltros] = useState<Filtros>({ cuarto: '', redzone: '', two_minute: '' })
  const lista = equipos.datos?.[0].equipos.map(e => e.equipo) ?? []

  // Primer rival de la lista por defecto
  useEffect(() => { if (!rival && lista.length) setRival(lista[0]) }, [lista, rival])

  const cambiar = (k: keyof Filtros) => (v: string) => setFiltros(f => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="no-imprimir sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-6 px-6 py-4">
          <div className="mr-auto">
            <h1 className="text-2xl font-bold text-slate-900">Leer al rival</h1>
            <p className="text-sm text-slate-500">Qué va a hacer el ataque rival y qué defensa conviene llamar</p>
          </div>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Rival (ataque)
            <select className="mt-1 rounded-lg border-2 border-blue-700 bg-white px-4 py-2 text-xl font-bold text-blue-800 focus:outline-none"
              value={rival} onChange={e => setRival(e.target.value)} disabled={!lista.length}>
              {lista.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </label>
          <Filtro etiqueta="Cuarto" valor={filtros.cuarto} onChange={cambiar('cuarto')}
            opciones={[['', 'Todos'], ['Q1', '1º'], ['Q2', '2º'], ['Q3', '3º'], ['Q4', '4º'], ['Tiempo extra', 'Tiempo extra']]} />
          <Filtro etiqueta="Red zone (≤ 20 yd)" valor={filtros.redzone} onChange={cambiar('redzone')} opciones={SI_NO} />
          <Filtro etiqueta="Two-minute drill" valor={filtros.two_minute} onChange={cambiar('two_minute')} opciones={SI_NO} />
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 px-6">
          {([['scouting', 'Scouting del rival'], ['hoja', 'Hoja de llamadas']] as const).map(([k, t]) => (
            <button key={k} onClick={() => setPestana(k)}
              className={`border-b-2 px-4 py-2 text-sm font-semibold ${pestana === k ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {equipos.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudo conectar con la API: {equipos.error}</p>}
        {rival && (pestana === 'scouting'
          ? <Scouting rival={rival} filtros={filtros} />
          : <HojaLlamadas rival={rival} filtros={filtros} />)}
      </main>
    </div>
  )
}
