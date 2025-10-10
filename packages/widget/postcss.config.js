module.exports = {
  plugins: [
    require('@tailwindcss/postcss')(),
    require('autoprefixer')(),
    require('postcss-prefixwrap')('.layerswap-styles')
  ]
}