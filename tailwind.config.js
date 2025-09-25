/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vaios brand colors
        vaios: {
          primary: '#02403D',
          black: '#000000',
          white: '#FFFFFF',
          accent: '#D1F812',
          teal: '#ADC7C8',
          gray: '#DEE2E3',
          // Extended teal palette
          50: '#EAEEEE',
          100: '#DEE6E6',
          200: '#C5D0D0',
          300: '#ADC7C8',
          400: '#8AADAE',
          500: '#4D7F80',
          600: '#02403D',
          700: '#023331',
          800: '#022422',
          900: '#011514',
        },
        // Override blue with VAIOS tones
        blue: {
          50: '#EAEEEE',
          100: '#DEE6E6',
          200: '#C5D0D0',
          300: '#ADC7C8',
          400: '#8AADAE',
          500: '#4D7F80',
          600: '#02403D',
          700: '#023331',
          800: '#022422',
          900: '#011514',
        }
      },
      textColor: {
        primary: '#02403D',
        accent: '#D1F812',
      },
      backgroundColor: {
        primary: '#02403D',
        accent: '#D1F812',
      },
      borderColor: {
        primary: '#02403D',
      },
      ringColor: {
        primary: '#02403D',
      },
      outlineColor: {
        primary: '#02403D',
      },
    },
  },
  plugins: [],
} 