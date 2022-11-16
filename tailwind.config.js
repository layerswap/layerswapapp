//@ts-check

const colors = require("tailwindcss/colors");
const plugin = require('tailwindcss/plugin')

const round = (num) =>
  num
    .toFixed(7)
    .replace(/(\.[0-9]+?)0+$/, '$1')
    .replace(/\.0$/, '')
const rem = (px) => `${round(px / 16)}rem`
const em = (px, base) => `${round(px / base)}em`

module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        darkblue: {
          DEFAULT: '#0C1527',
          '50': '#213869',
          '100': '#203665',
          '200': '#1D325D',
          '300': '#1B2D55',
          '400': '#18294E',
          '500': '#162546',
          '600': '#14213E',
          '700': '#111D36',
          '800': '#0F192F',
          '900': '#0C1527'
        },
      },
      transitionDuration: {
        '0': '0ms',
        '2000': '2000ms',
      },
      opacity: {
        '35': '.35',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fade-in 0.5s ease-in',
        'fade-in-down': 'fade-in-down 0.5s ease-in',
        'fadein': 'fadein 4s',
        'slide-in': 'slide-in 300ms',
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
        },
        'slide-in': {
          '0%': {
            transform: 'translateY(100%)',
          },
          '100%': {
            transform: 'translateY(0)',
          },
        },
        'slide-out': {
          '0%': {
            transform: 'translateY(0)',
          },
          '100%': {
            transform: 'translateY(100%)',
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
              color: theme('colors.primary.400'),
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
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    plugin(function ({ addVariant }) {
      // Add a `third` variant, ie. `third:pb-0`
      addVariant('scrollbar', '&::-webkit-scrollbar');
      addVariant('scrollbar-thumb', '&::-webkit-scrollbar-thumb')
      addVariant('focus-peer', '.focus-peer &')
      addVariant('wide-page', '.wide-page &')
    }),
    require('tailwindcss-themer')({
      defaultTheme: {
        extend: {
          colors: {
            primary: {
              DEFAULT: '#E42575',
              '50': '#F8C8DC',
              '100': '#F6B6D1',
              '200': '#F192BA',
              '300': '#ED6EA3',
              '400': '#E8498C',
              '500': '#E42575',
              '600': '#760045',
              '700': '#881143',
              '800': '#930863',
              '900': '#6e0040',
              'background': '#3e1240',
              'text': '#a4afc8',
              'buttonTextColor': '#ffffff',
              'logoColor': '#FF0093'
            },
          },

        },
      },
      themes: [
        {
          name: 'imxMarketplace',
          extend: {
            colors: {
              primary: {
                DEFAULT: '#2EECFF',
                '50': '#E6FDFF',
                '100': '#D1FBFF',
                '200': '#A8F7FF',
                '300': '#80F3FF',
                '400': '#57F0FF',
                '500': '#2EECFF',
                '600': '#00E8FF',
                '700': '#00ACBD',
                '800': '#007985',
                '900': '#00464D',
                'background': '#007985',
                'text': '#D1FBFF',
                'buttonTextColor': '#000000',
                'logoColor': '#ffffffff'
              },
            },
          },
        }
      ]
    })
  ],
};
