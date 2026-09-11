/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        background: "var(--bg-primary)",
        card: "var(--bg-card)",
      }
    },
  },
  plugins: [],
}
