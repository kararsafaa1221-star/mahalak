/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        'deep-navy': '#0B1320',
        'deep-navy-light': '#151d2b',
        'vibrant-purple': '#7B3DFF',
        violet: '#B18CFF',
        mahalak: {
          navy: '#0B1320',
          purple: '#7B3DFF',
          violet: '#B18CFF',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Cairo',
          'IBM Plex Sans Arabic',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        arabic: ['Cairo', 'IBM Plex Sans Arabic', 'sans-serif'],
        english: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-glow': '0 0 15px -3px rgba(123, 61, 255, 0.5), 0 4px 6px -2px rgba(123, 61, 255, 0.2)',
        'brand-glow-lg': '0 0 25px -5px rgba(123, 61, 255, 0.6), 0 10px 10px -5px rgba(123, 61, 255, 0.3)',
      },
      backgroundImage: {
        'mahalak-gradient': 'linear-gradient(180deg, #0B1320 0%, #151d2b 100%)',
        'brand-horizontal': 'linear-gradient(90deg, #7B3DFF 0%, #0B1320 100%)',
      },
    },
  },
};
