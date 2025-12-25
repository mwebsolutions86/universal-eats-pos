/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF5733', // Couleur Food Tech par défaut
      }
    },
  },
  plugins: [],
}