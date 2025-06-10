const plugin = require('tailwindcss/plugin')

module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "!../../**/node_modules/**/*.{html,js,ts,jsx,tsx}",
        "!./node_modules/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'media',
    theme: {
        borderRadius: {
            none: '0',
            sm: 'var(--ls-border-radius-sm, 0.5rem)',
            DEFAULT: 'var(--ls-border-radius-default, 0.25rem)',
            md: 'var(--ls-border-radius-md, 1rem)',
            lg: 'var(--ls-border-radius-lg, 1.5rem)',
            xl: 'var(--ls-border-radius-xl, 2rem)',
            full: 'var(--ls-border-radius-full, 9999px)',
        },
        extend: {
            colors: {
                coinbase: { primary: '#4a6cee', diabled: '#192445' },
                primary: {
                    DEFAULT: 'rgb(var(--ls-colors-primary, 7, 149, 95), <alpha-value>)',
                    '50': 'rgb(var(--ls-colors-primary-50, 217, 244, 232), <alpha-value>)',
                    '100': 'rgb(var(--ls-colors-primary-100, 185, 236, 209), <alpha-value>)',
                    '200': 'rgb(var(--ls-colors-primary-200, 145, 221, 175), <alpha-value>)',
                    '300': 'rgb(var(--ls-colors-primary-300, 102, 199, 138), <alpha-value>)',
                    '400': 'rgb(var(--ls-colors-primary-400, 61, 172, 100), <alpha-value>)',
                    '500': 'rgb(var(--ls-colors-primary-500, 7, 149, 95), <alpha-value>)',
                    '600': 'rgb(var(--ls-colors-primary-600, 6, 121, 77), <alpha-value>)',
                    '700': 'rgb(var(--ls-colors-primary-700, 5, 97, 62), <alpha-value>)',
                    '800': 'rgb(var(--ls-colors-primary-800, 4, 75, 48), <alpha-value>)',
                    '900': 'rgb(var(--ls-colors-primary-900, 3, 58, 37), <alpha-value>)',
                    'background': 'rgb(var(--ls-colors-backdrop, 62, 18, 64), <alpha-value>)',
                    'text': 'rgb(var(--ls-colors-primary-text, 255, 255, 255), <alpha-value>)',
                    'text-muted': 'rgb(var(--ls-colors-primary-text-muted, 86, 97, 123), <alpha-value>)',
                    'text-placeholder': 'rgb(var(--ls-colors-text-placeholder, 140, 152, 192), <alpha-value>)',
                    'actionButtonText': 'rgb(var(--ls-colors-actionButtonText, 255, 255, 255), <alpha-value>)',
                    'buttonTextColor': 'rgb(var(--ls-colors-buttonTextColor, 228, 229, 240), <alpha-value>)',
                    'logoColor': 'rgb(var(--ls-colors-logo, 7, 149, 95), <alpha-value>)',
                },
                secondary: {
                    DEFAULT: 'rgb(var(--ls-colors-secondary, 42, 44, 52), <alpha-value>)',
                    '50': 'rgb(var(--ls-colors-secondary-50, 224, 225, 228), <alpha-value>)',
                    '100': 'rgb(var(--ls-colors-secondary-100, 205, 206, 210), <alpha-value>)',
                    '200': 'rgb(var(--ls-colors-secondary-200, 176, 177, 182), <alpha-value>)',
                    '300': 'rgb(var(--ls-colors-secondary-300, 147, 148, 153), <alpha-value>)',
                    '400': 'rgb(var(--ls-colors-secondary-400, 117, 119, 125), <alpha-value>)',
                    '500': 'rgb(var(--ls-colors-secondary-500, 88, 90, 97), <alpha-value>)',
                    '600': 'rgb(var(--ls-colors-secondary-600, 70, 72, 79), <alpha-value>)',
                    '700': 'rgb(var(--ls-colors-secondary-700, 42, 44, 52), <alpha-value>)',
                    '800': 'rgb(var(--ls-colors-secondary-800, 32, 34, 40), <alpha-value>)',
                    '900': 'rgb(var(--ls-colors-secondary-900, 23, 24, 29), <alpha-value>)',
                    '950': 'rgb(var(--ls-colors-secondary-900, 11, 17, 11), <alpha-value>)',
                    'text': 'rgb(var(--ls-colors-secondary-text, 171, 181, 209), <alpha-value>)',
                },
            },
            opacity: {
                '35': '.35',
            },
            transitionDuration: {
                '0': '0ms',
                '2000': '2000ms',
            },
            transitionProperty: {
                'height': 'height'
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
                'widget-footer': '-1px -28px 21px -6px var(--ls-colors-secondary-900, #0C1527)',
                'card': '5px 5px 40px rgba(0, 0, 0, 0.2), 0px 0px 20px rgba(0, 0, 0, 0.43)',
            },
        },
    },
    variants: {
        extend: {
            opacity: ["disabled"],
            cursor: ["hover", "focus", "disabled"],
            backgroundColor: ["disabled"],
            translate: ["hover"],
            display: ["group-hover"],
            fill: ['hover', 'focus']
        },
    },
    plugins: [
        require("@tailwindcss/forms"),
        require("@tailwindcss/typography"),
        require("tailwindcss-animate"),
        plugin(function ({ addVariant }) {
            // Add a `third` variant, ie. `third:pb-0`
            addVariant('scrollbar', '&::-webkit-scrollbar');
            addVariant('scrollbar-thumb', '&::-webkit-scrollbar-thumb')
            addVariant('focus-peer', '.focus-peer &')
            addVariant('wide-page', '.wide-page &')
        })
    ],
};
