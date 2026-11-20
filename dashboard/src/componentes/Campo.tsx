// Campo de juego en SVG: % de éxito del rival por zona vs liga
import { ruta, useApi, type CampoResp, type Filtros, type ZonaCampo } from '../api'
import { nombreFormacion, num } from '../formato'
import { Estado, Panel } from './Comunes'

// Medidas reales en yardas: 120 x 53.3 (end zones de 10 yd)
const LARGO = 120
const ANCHO = 53.3
const HASH_ARRIBA = 23.58
const HASH_ABAJO = ANCHO - 23.58
const PASTO = '#2f7d3c'
const PASTO_OSCURO = '#286b33'

/** x en el SVG de una yarda "faltan" (0 = nuestra línea de gol, a la izquierda) */
const xDe = (faltan: number) => 10 + faltan

/** Límites de la zona en el SVG; la zona más lejana llega hasta la línea de gol rival (100) */
const tope = (z: ZonaCampo) => (z.hasta === 99 ? 100 : z.hasta)
const limites = (z: ZonaCampo) => ({ x0: xDe(z.desde - 1), x1: xDe(tope(z)) })

/** Capa de la zona: rojo si el rival supera a la liga, azul si queda por debajo */
function capa(dif: number | null): { color: string; opacidad: number } {
  if (dif == null) return { color: '#ffffff', opacidad: 0 }
  const intensidad = Math.min(Math.abs(dif) / 20, 1)
  return { color: dif > 0 ? '#dc2626' : '#2563eb', opacidad: 0.12 + 0.5 * intensidad }
}

function LineasYNumeros() {
  const lineas = []
  for (let x = 10; x <= 110; x += 5) {
    lineas.push(<line key={`l${x}`} x1={x} y1={0} x2={x} y2={ANCHO} stroke="white" strokeWidth={x % 10 === 0 ? 0.25 : 0.15} opacity={0.85} />)
  }
  // Marcas hash y de las bandas cada yarda
  const hashes = []
  for (let x = 11; x < 110; x++) {
    if (x % 5 === 0) continue
    for (const y of [0.4, HASH_ARRIBA, HASH_ABAJO - 0.8, ANCHO - 1.2]) {
      hashes.push(<line key={`h${x}-${y}`} x1={x} y1={y} x2={x} y2={y + 0.8} stroke="white" strokeWidth={0.12} opacity={0.8} />)
    }
  }
  const numeros = [10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => {
    const x = 20 + i * 10
    return [
      <text key={`na${i}`} x={x} y={8.5} fill="white" fontSize={3} fontWeight={700} textAnchor="middle" opacity={0.9}>{n}</text>,
      <text key={`nb${i}`} x={x} y={ANCHO - 6.5} fill="white" fontSize={3} fontWeight={700} textAnchor="middle" opacity={0.9}
        transform={`rotate(180 ${x} ${ANCHO - 7.5})`}>{n}</text>,
    ]
  })
  return <g>{lineas}{hashes}{numeros}</g>
}

function EndZone({ x, texto, color }: { x: number; texto: string; color: string }) {
  const cx = x + 5
  return (
    <g>
      <rect x={x} y={0} width={10} height={ANCHO} fill={color} />
      <text x={cx} y={ANCHO / 2} fill="white" fontSize={2.6} fontWeight={800} letterSpacing={0.4} textAnchor="middle"
        dominantBaseline="middle" transform={`rotate(${x < 60 ? -90 : 90} ${cx} ${ANCHO / 2})`}>{texto}</text>
    </g>
  )
}

function EtiquetaZona({ z }: { z: ZonaCampo }) {
  const { x0, x1 } = limites(z)
  const cx = (x0 + x1) / 2
  const ancho = 17, alto = 13.5, y = ANCHO / 2 - alto / 2
  const dif = z.diferencia
  const tono = dif == null ? '#475569' : dif > 0 ? '#b91c1c' : '#1d4ed8'
  return (
    <g>
      <text x={cx} y={12.5} fill="white" fontSize={1.9} fontWeight={700} textAnchor="middle" letterSpacing={0.2}>
        {z.red_zone ? 'RED ZONE · ' : ''}{tope(z)}-{z.desde} YD
      </text>
      <rect x={cx - ancho / 2} y={y} width={ancho} height={alto} rx={1.2} fill="white" opacity={0.95} />
      <text x={cx} y={y + 3.6} fontSize={2.9} fontWeight={800} textAnchor="middle" fill={tono}>
        {z.n ? `${num(z.exito.valor, 0)}%` : '—'}
      </text>
      <text x={cx} y={y + 6.3} fontSize={1.6} textAnchor="middle" fill="#334155">
        vs liga {num(z.liga.valor, 0)}%{dif != null ? ` (${dif > 0 ? '+' : '−'}${Math.abs(dif).toFixed(0)})` : ''}
      </text>
      <text x={cx} y={y + 9} fontSize={1.6} textAnchor="middle" fill="#334155">
        {z.formacion.formacion ? `${nombreFormacion(z.formacion.formacion)} ${num(z.formacion.pct, 0)}%` : 'sin formación'}
      </text>
      <text x={cx} y={y + 11.6} fontSize={1.6} fontWeight={700} textAnchor="middle" fill="#0f172a">
        n = {z.n}{z.muestra_pequena ? '*' : ''}
      </text>
    </g>
  )
}

function Flecha() {
  const y = ANCHO - 3.2
  return (
    <g>
      <defs>
        <marker id="punta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#facc15" />
        </marker>
      </defs>
      <line x1={98} y1={y} x2={24} y2={y} stroke="#facc15" strokeWidth={0.6} markerEnd="url(#punta)" />
      <text x={61} y={y - 1} fill="#facc15" fontSize={1.7} fontWeight={700} textAnchor="middle">DIRECCIÓN DEL ATAQUE RIVAL</text>
    </g>
  )
}

export default function Campo({ rival, filtros, color }: { rival: string; filtros: Filtros; color: string }) {
  const r = useApi<CampoResp>([ruta('campo', { rival, cuarto: filtros.cuarto, two_minute: filtros.two_minute })])
  const zonas = r.datos?.[0].zonas ?? []
  return (
    <Panel titulo="Dónde nos hace daño el rival" subtitulo="% de éxito del rival por zona del campo, comparado con la liga">
      {r.datos ? (
        <>
          <svg viewBox={`0 0 ${LARGO} ${ANCHO}`} className="w-full rounded-lg shadow-inner" role="img"
            aria-label={`Campo con el % de éxito de ${rival} por zona`}>
            <rect x={0} y={0} width={LARGO} height={ANCHO} fill={PASTO} />
            {[...Array(10)].map((_, i) => i % 2 === 0
              ? <rect key={i} x={10 + i * 10} y={0} width={10} height={ANCHO} fill={PASTO_OSCURO} /> : null)}
            {zonas.map(z => {
              const c = capa(z.diferencia)
              const { x0, x1 } = limites(z)
              return <rect key={z.zona} x={x0} y={0} width={x1 - x0} height={ANCHO} fill={c.color} opacity={c.opacidad} />
            })}
            <LineasYNumeros />
            <EndZone x={0} texto="NUESTRA END ZONE" color="#2E1065" />
            <EndZone x={110} texto={`END ZONE ${rival}`} color={color} />
            <rect x={0} y={0} width={LARGO} height={ANCHO} fill="none" stroke="white" strokeWidth={0.4} />
            {zonas.map(z => <EtiquetaZona key={z.zona} z={z} />)}
            <Flecha />
          </svg>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-600/60" /> rival con más éxito que la liga (nos hace daño)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-blue-600/60" /> rival con menos éxito que la liga</span>
            <span>Intensidad = tamaño de la diferencia · * n &lt; 30 (muestra pequeña) · formación más usada en la zona</span>
          </div>
        </>
      ) : <Estado cargando={r.cargando} error={r.error} />}
    </Panel>
  )
}
