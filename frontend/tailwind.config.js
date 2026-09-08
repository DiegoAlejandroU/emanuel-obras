/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obra: {
          50: '#f2f7f2',
          100: '#dfeee0',
          600: '#2f7d3a',
          700: '#256330',
        },
      },
    },
  },
  plugins: [],
}
