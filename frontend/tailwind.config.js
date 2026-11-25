/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1526',
          800: '#0f1f38',
          700: '#162b4d',
        },
      },
    },
  },
  plugins: [],
};
