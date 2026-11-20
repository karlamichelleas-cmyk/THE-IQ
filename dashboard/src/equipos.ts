// Nombre y color primario de cada equipo (abreviaturas de los datos). Sin logos.
export const EQUIPOS: Record<string, { nombre: string; color: string }> = {
  ARI: { nombre: 'Arizona Cardinals', color: '#97233F' },
  ATL: { nombre: 'Atlanta Falcons', color: '#A71930' },
  BAL: { nombre: 'Baltimore Ravens', color: '#241773' },
  BUF: { nombre: 'Buffalo Bills', color: '#00338D' },
  CAR: { nombre: 'Carolina Panthers', color: '#0085CA' },
  CHI: { nombre: 'Chicago Bears', color: '#0B162A' },
  CIN: { nombre: 'Cincinnati Bengals', color: '#FB4F14' },
  CLE: { nombre: 'Cleveland Browns', color: '#311D00' },
  DAL: { nombre: 'Dallas Cowboys', color: '#003594' },
  DEN: { nombre: 'Denver Broncos', color: '#FB4F14' },
  DET: { nombre: 'Detroit Lions', color: '#0076B6' },
  GB: { nombre: 'Green Bay Packers', color: '#203731' },
  HOU: { nombre: 'Houston Texans', color: '#03202F' },
  IND: { nombre: 'Indianapolis Colts', color: '#002C5F' },
  JAX: { nombre: 'Jacksonville Jaguars', color: '#006778' },
  KC: { nombre: 'Kansas City Chiefs', color: '#E31837' },
  LA: { nombre: 'Los Angeles Rams', color: '#003594' },
  LAC: { nombre: 'Los Angeles Chargers', color: '#0080C6' },
  LV: { nombre: 'Las Vegas Raiders', color: '#000000' },
  MIA: { nombre: 'Miami Dolphins', color: '#008E97' },
  MIN: { nombre: 'Minnesota Vikings', color: '#4F2683' },
  NE: { nombre: 'New England Patriots', color: '#002244' },
  NO: { nombre: 'New Orleans Saints', color: '#D3BC8D' },
  NYG: { nombre: 'New York Giants', color: '#0B2265' },
  NYJ: { nombre: 'New York Jets', color: '#125740' },
  PHI: { nombre: 'Philadelphia Eagles', color: '#004C54' },
  PIT: { nombre: 'Pittsburgh Steelers', color: '#FFB612' },
  SEA: { nombre: 'Seattle Seahawks', color: '#002244' },
  SF: { nombre: 'San Francisco 49ers', color: '#AA0000' },
  TB: { nombre: 'Tampa Bay Buccaneers', color: '#D50A0A' },
  TEN: { nombre: 'Tennessee Titans', color: '#0C2340' },
  WAS: { nombre: 'Washington Football Team', color: '#5A1414' },
}

const RESPALDO = '#1e3a8a'

export const colorEquipo = (eq: string) => EQUIPOS[eq]?.color ?? RESPALDO
export const nombreEquipo = (eq: string) => EQUIPOS[eq]?.nombre ?? eq

/** Texto legible (blanco u oscuro) sobre el color del equipo */
export function textoSobre(hex: string): string {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.55 ? '#0f172a' : '#ffffff'
}
