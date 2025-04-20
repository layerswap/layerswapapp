const {
    LITERAL,
    JSX_TEXT,
    JSX_ELEMENT,
    TEMPLATE_LITERAL,
    LOGICAL_EXPRESSION,
    CONDITIONAL_EXPRESSION,
    JSX_EXPRESSION_CONTAINER,
  } = require('./constants')
  
  const specialCharacters = /(\n)|(\t)|(\s)|(\r)|(\f)|(\v)/
  
  const removeSpecialCharacters = (text) => (
    text.replace(/(\n)|(\t)|(\s)|(\r)|(\f)|(\v)|(&[a-z]+;)/gm, '')
  )
  
  const isWhitespace = (text) => (/\s/).test(text)
  
  const shouldLintExpression = (expression) => (
    expression.type === TEMPLATE_LITERAL || expression.type === CONDITIONAL_EXPRESSION || (
      expression.type === LOGICAL_EXPRESSION && (
        expression.right.type === LITERAL ||
        expression.right.type === TEMPLATE_LITERAL ||
        expression.right.type === JSX_ELEMENT
      )
    )
  )
  
  const filterSiblings = (self, children = []) => (
    children.filter(({ range, type, value, expression }) => (
      (range[0] !== self[0] && range[1] !== self[1]) && (
        type === JSX_TEXT && removeSpecialCharacters(value) ||
        type === JSX_EXPRESSION_CONTAINER && shouldLintExpression(expression) ||
        type === JSX_ELEMENT
      )
    ))
  )
  
  const jsxTextFixer = (element) => {
    let loc = {
      start: { line: undefined, column: undefined },
      end: { line: undefined, column: undefined },
    }
  
    const byLine = element.raw.split('\n')
    const numLines = byLine.length
  
    let fixed = byLine.slice()
  
    let open = false
    let close = false
  
    let index = 0
    while (index < numLines && open === false) {
      const line = byLine[index]
  
      if (removeSpecialCharacters(line)) {
        for (let i = 0; i < line.length; i += 1) {
          if (specialCharacters.test(line[i])) continue
  
          if (index === 0) {
            if (isWhitespace(line[0])) {
              fixed[index] = '&nbsp;' + line.slice(1)
            }
  
            fixed[index] = '<span>' + fixed[index]
            loc.start = element.loc.start
  
          } else {
            fixed[index] = line.slice(0, i) + '<span>' + line.slice(i)
            loc.start = { line: element.loc.start.line + index, column: i }
          }
  
          open = true
          break
        }
      }
  
      index += 1
    }
  
    index = numLines - 1
    while (index >= 0 && close === false) {
      let line = fixed[index]
  
      if (removeSpecialCharacters(line)) {
        if (isWhitespace(line[line.length - 1])) {
          line = line.slice(0, line.length - 1) + '&nbsp;'
        }
  
        fixed[index] = line + '</span>'
  
        if (numLines - 1 === index) {
          loc.end = element.loc.end
        } else {
          loc.end = {
            line: element.loc.end.line - ((numLines - 1) - index),
            column: loc.start.column + byLine[index].length
          }
        }
        close = true
      }
  
      index -= 1
    }
  
    return { loc, text: fixed.join('\n') }
  }
  
  
  module.exports = { jsxTextFixer, removeSpecialCharacters, filterSiblings }