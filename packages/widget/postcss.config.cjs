const removeLayersPlugin = () => {
  return {
    postcssPlugin: 'remove-layers',
    AtRule: {
      layer: (atRule) => {
        // Unwrap the layer and replace with its contents
        atRule.replaceWith(atRule.nodes);
      },
    },
  };
};
removeLayersPlugin.postcss = true;

module.exports = {
  plugins: [
    require('@tailwindcss/postcss')(),
    removeLayersPlugin(),  // Call it as a function
    require('autoprefixer')(),
    require('postcss-prefixwrap')('.layerswap-styles')
  ]
}