/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Inter si está instalada en el equipo; si no, la fuente del sistema
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // Condensada, estilo transmisión deportiva
        display: ['Oswald', 'Barlow Condensed', 'Arial Narrow', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
