// frontend/postcss.config.js
// Reverting to use @tailwindcss/postcss
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // Use this specific package key
    'autoprefixer': {},
  },
}