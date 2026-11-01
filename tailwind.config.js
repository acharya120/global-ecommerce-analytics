/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16212B', soft: '#4B5B68' },
        paper: { DEFAULT: '#F5F7F8', card: '#FFFFFF' },
        night: { DEFAULT: '#0F1417', card: '#172026', line: '#26323A' },
        teal: { brand: '#0E7C7B', soft: '#D8EFEE' },
        saffron: '#E9A23B',
      },
    },
  },
  plugins: [],
};
