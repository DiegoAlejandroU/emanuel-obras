/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Paleta original — se conserva por compatibilidad, aunque las
        // páginas rediseñadas usan los tokens nuevos de abajo.
        obra: {
          50: '#f2f7f2',
          100: '#dfeee0',
          600: '#2f7d3a',
          700: '#256330',
        },
        // Tokens del rediseño (spec "Sistema de Obras" — Claude Design).
        ink: '#1c1d1a',
        paper: '#f7f7f4',
        sidebar: '#f1f1ed',
        line: {
          DEFAULT: '#e7e6e1',
          soft: '#f0efea',
          softer: '#f4f3ef',
          strong: '#e3e2db',
          input: '#dddbd3',
        },
        muted: {
          DEFAULT: '#5e5f58',
          2: '#7a7b73',
          3: '#8a8b83',
          4: '#3d3e38',
        },
        brand: {
          DEFAULT: '#2f6f3e',
          dark: '#285f35',
          darker: '#1f3a27',
          accent: '#2f7d3a',
          soft: '#e9efe8',
          mute: '#a9bcaa',
          mute2: '#8fae93',
          mute3: '#bccbbd',
          tint: '#dfe7dc',
          text: '#1f5f30',
        },
        finance: {
          DEFAULT: '#2563eb',
          dark: '#1d4fd7',
          soft: '#e9effd',
          mute: '#6d8fe6',
        },
        // Claves "planas" (no anidadas 3 niveles) para que Tailwind genere
        // las utilidades de forma predecible: bg-status-draft-bg, etc.
        'status-draft': { bg: '#efefeb', fg: '#55564f', dot: '#9a9a92' },
        'status-sent': { bg: '#fdf1dc', fg: '#8a5300', dot: '#d99a1e' },
        'status-approved': { bg: '#e7f2ea', fg: '#1f5f30', dot: '#2f7d3a' },
        'status-rejected': { bg: '#fcebe9', fg: '#a1261b', dot: '#d14a3c' },
        'status-closed': { bg: '#eceef1', fg: '#3b4250', dot: '#6b7385' },
      },
      boxShadow: {
        pill: '0 1px 2px rgba(28,29,26,.08), 0 0 0 1px #e3e2db',
        card: '0 2px 8px rgba(28,29,26,.05)',
        drawer: '-12px 0 32px rgba(28,29,26,.12)',
        focus: '0 0 0 3px rgba(47,111,62,.15)',
      },
    },
  },
  plugins: [],
}
