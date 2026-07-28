const noConditionalLiterals = require("./rules/no-conditional-literals-in-jsx");
const noUnwrappedJsxText = require("./rules/no-unwrapped-jsx-text");
const plugin = {
    rules: {
        "no-conditional-literals-in-jsx": noConditionalLiterals,
        "no-unwrapped-jsx-text": noUnwrappedJsxText
    },
};
module.exports = plugin;