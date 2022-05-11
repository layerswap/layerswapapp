const colors = require("tailwindcss/colors");

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
      opacity: {
        '35': '.35',
      },
      colors: {
        cyan: colors.cyan,
        pink: colors.pink,
        blueGray: colors.blueGray,
        coolGray: colors.coolGray,
        darkBlue: '#111827',
        'ouline-blue': '#1A2949',
        'light-blue': '#74AAC8',
        'darkblue-600': '#131E36',
        'darkblue-500': '#121D33',
        'darkblue-300': '#192846',
        'darkblue-200': '#2C3C60',
        'pink-primary': '#FF0093',

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
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
