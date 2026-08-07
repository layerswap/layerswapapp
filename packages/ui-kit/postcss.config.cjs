module.exports = {
  plugins: [
    require('@tailwindcss/postcss')(),
    require('postcss-prefixwrap')('[data-ui-kit]'),
  ],
}
