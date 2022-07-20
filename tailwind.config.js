const colors = require("tailwindcss/colors");
const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

const round = (num) =>
  num
    .toFixed(7)
    .replace(/(\.[0-9]+?)0+$/, '$1')
    .replace(/\.0$/, '')
const rem = (px) => `${round(px / 16)}rem`
const em = (px, base) => `${round(px / base)}em`

module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      transitionDuration: {
        '0': '0ms',
        '2000': '2000ms',
      },
      opacity: {
        '35': '.35',
      },
      animation: {
        fadein: 'fadein 4s',
      },
      colors: {
        cyan: colors.cyan,
        pink: colors.pink,
        blueGray: colors.blueGray,
        coolGray: colors.coolGray,
        darkBlue: '#111827',
        'ouline-blue': '#1A2949',
        'darkblue': '#4771FF',
        'darkblue-600': '#131E36',
        'darkblue-500': '#121D33',
        'darkblue-300': '#192846',
        'darkblue-200': '#2C3C60',
        'darkblue-100': '#1A2949',
        'darkblue-50': '#203259',
        'darkblue-disabled':'#2b344d',
        'pink-primary': '#E42575',
        'pink-primary-600': '#760045',
        'pink-primary-800': '#930863',
        'pink-primary-300': '#a4afc8', //'#A197AA',
        'green-success': '#55B585',
        'red-failed': '#E43636',
        'white-alpha-100': '#ffffff66'
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fade-in 0.5s ease-in',
        'fade-in-down': 'fade-in-down 0.5s ease-in'
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '20%': {
            opacity: '0.6',
          },
          '100%': {
            opacity: '1',
          },
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      letterSpacing: {
        tightest: '-.075em',
        tighter: '-.05em',
        tight: '-.025em',
        normal: '0',
        wide: '.025em',
        wider: '.05em',
        widest: '.1em',
        widest: '.25em',
      },
      boxShadow: {
        'card': '5px 5px 40px rgba(0, 0, 0, 0.2), 0px 0px 200px rgba(0, 0, 0, 0.43)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            h1: {
              color: '#FFF',
              textAlign: 'center',
            },
            h2: {
              color: '#FFF',
              textAlign: 'center',
            },
            h3: {
              color: '#FFF',
            },
            h4: {
              color: '#FFF',
            },
            h5: {
              color: '#FFF',
            },
            a: {
              color: theme('colors.pink.400'),
            },
            strong: {
              color: '#FFF'
            },
            blockquote: {
              color: '#FFF'
            }
          },
        }
      }),
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["hover", "focus", "disabled"],
      backgroundColor: ["disabled"],
      translate: ["hover"],
      display: ["group-hover"],
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography"),
  plugin(function ({ addVariant }) {
    // Add a `third` variant, ie. `third:pb-0`
    addVariant('scrollbar', '&::-webkit-scrollbar');
    addVariant('scrollbar-thumb', '&::-webkit-scrollbar-thumb')
  })],
};
