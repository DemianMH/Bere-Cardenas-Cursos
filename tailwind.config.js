/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Esto le dice a Tailwind que busque clases en TODOS los archivos dentro de src/app
    './src/app/**/*.{js,ts,jsx,tsx,mdx}' 
  ],
  theme: {
    extend: {
      colors: {
        'background': '#F8F8F8',
        'primary-light': '#F4CFCC',
        'primary-medium': '#EAA0AB',
        'primary-dark': '#A87379',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
      }
    },
  },
  plugins: [],
};