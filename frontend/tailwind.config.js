// frontend/tailwind.config.js
// Standard configuration for Tailwind CSS v3.x

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensure this scans all your component files
  ],
  theme: {
    extend: {
      // You can add custom extensions here later if needed
      // For example:
      // colors: {
      //   'brand-blue': '#007bff',
      // },
      // fontFamily: {
      //   'sans': ['Inter', 'system-ui', ...],
      // }
    },
  },
  plugins: [],
};