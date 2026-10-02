/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        festive: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        royal: {
          red: '#8B1119',
          crimson: '#A6192E',
          deepRed: '#5E0910',
          gold: '#D4AF37',
          goldDark: '#997F24',
          goldLight: '#F5E7B2',
          cream: '#FFFDF9',
          sand: '#FAF4E8',
          emerald: '#0B6623',
          emeraldLight: '#1B8A3D'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        festive: ['"Cinzel"', 'serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        'festive-sm': '0 2px 8px -2px rgba(139, 17, 25, 0.08), 0 1px 4px -1px rgba(212, 175, 55, 0.1)',
        'festive': '0 8px 30px -4px rgba(139, 17, 25, 0.12), 0 4px 12px -2px rgba(212, 175, 55, 0.15)',
        'festive-lg': '0 20px 40px -8px rgba(139, 17, 25, 0.18), 0 8px 20px -4px rgba(212, 175, 55, 0.25)',
        'gold-glow': '0 0 25px rgba(212, 175, 55, 0.35)',
        'red-glow': '0 0 25px rgba(185, 28, 28, 0.25)',
      },
      backgroundImage: {
        'festive-gradient': 'linear-gradient(135deg, #FFFDF9 0%, #FEF5EA 50%, #FFFDF9 100%)',
        'royal-gradient': 'linear-gradient(135deg, #8B1119 0%, #A6192E 50%, #6E0B13 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F5E7B2 0%, #D4AF37 50%, #AA8C2C 100%)',
        'ticket-gradient': 'linear-gradient(135deg, #7A0C13 0%, #9C131B 50%, #64080E 100%)',
      }
    },
  },
  plugins: [],
}
