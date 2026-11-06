/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Spacer.land coordination palette
        spacer: {
          white: '#FFFFFF',
          silver: '#BDBDBD',
          darkShaft: '#232323',
          shaft: '#323232',
          tundro: '#4C4C4C',
          highland: '#789158',
          wasabi: '#7C923C',
          whatsapp: '#B8DD5A',
          merlot: '#8B1626',
          red: '#FF003D',
          muleFawn: '#9B4A2E',
          luxorGold: '#A07C2E',
          codGrey: '#151515',
          goldenGlow: '#FBD879',
          charcoal: 'rgba(37, 37, 37, .9)',
          dimGrey: 'rgba(102, 102, 102, .25)',
        },
        plot: {
          available: '#789158', // Spacer highland green
          reserved: '#9B4A2E',  // Spacer mule-fawn brown
          hold: '#A07C2E',      // Spacer luxor-gold
          sold: '#8B1626',      // Spacer merlot
          blocked: '#4C4C4C',   // Spacer tundro
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};
