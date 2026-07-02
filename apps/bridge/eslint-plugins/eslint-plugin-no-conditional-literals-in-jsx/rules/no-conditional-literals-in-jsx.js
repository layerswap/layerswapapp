
// From https://gist.github.com/azirbel/51518d919de979197a7c5c25c54a56d6
module.exports = {
    meta: {
        docs: {
            description:
                'Browser auto-translation will break if pieces of text nodes are be rendered conditionally.',
        },
        schema: [],
        messages: {
            unexpected:
                'Conditional expression is a sibling of raw text and must be wrapped in <div> or <span>',
        },
    },
    create: function (context) {
        return {
            // Imagine evaluating <div>text {conditional && 'string'}</div>
            JSXExpressionContainer(node) {
                // We start at the expression {conditional && 'string'}
                if (node.expression.type !== 'LogicalExpression') return

                // "text" is one of the siblingTextNodes.
                const siblingTextNodes = (node.parent.children || []).filter(n => {
                    // In normal code these are 'Literal', but in test code they are 'JSXText'
                    const isText = n.type === 'Literal' || n.type === 'JSXText'
                    // Skip empty text nodes, like "   \n   " -- these may be JSX artifacts
                    return isText && !!n.value.trim()
                })

                // If we were evaluting
                //   <div>{property} {conditional && 'string'}</div>
                // Then {property} would be one of the siblingExpressionNodes
                const siblingExpressionNodes = (node.parent.children || []).filter(
                    n =>
                        n.type === 'JSXExpressionContainer' &&
                        (n.expression.type === 'Identifier' ||
                            n.expression.type === 'MemberExpression')
                )

                // Operands of {conditional && 'string'} -- the conditional and the
                // literal. We want to make sure we have a text literal, otherwise we'd
                // trigger this rule on the (safe) {conditional && <div>string</div>}.
                const expressionOperandTypes = [
                    node.expression.left.type,
                    node.expression.right.type,
                ]
                if (
                    siblingTextNodes.concat(siblingExpressionNodes).length > 0 &&
                    expressionOperandTypes.includes('Literal')
                ) {
                    context.report({ node, messageId: 'unexpected' })
                }
            },
        }
    },
}