/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        virla: {
          roxo:          '#800080', // Primary brand color — buttons, icons, headers
          roxohighlight: '#9932CC', // Hover/active variant
          neve:          '#FFFAFA', // Warm white — page backgrounds
          texto:         '#333333', // Dark gray — body text
        },
      },
      fontFamily: {
        // Keep Playfair available via Tailwind for display headings
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}