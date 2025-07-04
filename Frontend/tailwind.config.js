/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'rgba(255, 255, 255, 0.2)',
        foreground: 'rgba(255, 255, 255, 0.9)',
      },
    },
  },
  plugins: [],
};