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
        },
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
    },
  },
  plugins: [],
} 