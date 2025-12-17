/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#121212', // Negro profundo para el fondo
        'surface': '#1E1E1E',    // Un gris muy oscuro para tarjetas y superficies
        'primary': '#D4AF37',    // El dorado para acentos y botones
        'text-primary': '#FFFFFF',  // Blanco puro para títulos y texto importante
        'text-secondary': '#A9A9A9', // Gris claro para texto secundario
      },
      fontFamily: {
        sans: ['var(--font-montserrat)'],
      }
    },
  },
  plugins: [],
};