// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Checks the main HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // Checks all these file types within src and subdirectories
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}