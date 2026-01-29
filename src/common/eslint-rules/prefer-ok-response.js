/**
 * ESLint rule: prefer-ok-response
 * Ensures that methods inside classes decorated with @Controller return an ok(...) response.
 */
export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer returning ok(...) responses from controller methods',
            category: 'Best Practices',
            recommended: false,
        },
        schema: [],
        messages: {
            preferOk: 'Controller methods should return an ok(...) response.',
        },
    },

    create(context) {
        // Recursively walk an ESTree node and call the predicate on each node until one returns true
        function nodeContainsOkCall(node) {
            if (!node || typeof node !== 'object') return false;

            // If this node is a CallExpression whose callee is identifier `ok`, that's a match
            if (node.type === 'CallExpression') {
                const callee = node.callee;
                if (callee && callee.type === 'Identifier' && callee.name === 'ok') {
                    return true;
                }

                // If callee is a MemberExpression, the underlying object may be a CallExpression of ok(...)
                if (callee && callee.type === 'MemberExpression') {
                    if (nodeContainsOkCall(callee.object)) return true;
                }

                // Check arguments for nested ok(...) usage
                if (Array.isArray(node.arguments)) {
                    for (const arg of node.arguments) {
                        if (nodeContainsOkCall(arg)) return true;
                    }
                }
            }

            // Generic recursive descent for other node types
            for (const key of Object.keys(node)) {
                // Skip tokens and parent pointers
                if (key === 'parent' || key === 'range' || key === 'loc') continue;
                const child = node[key];
                if (Array.isArray(child)) {
                    for (const c of child) {
                        if (nodeContainsOkCall(c)) return true;
                    }
                } else if (child && typeof child === 'object') {
                    if (nodeContainsOkCall(child)) return true;
                }
            }

            return false;
        }

        // Walk the function body to find any ReturnStatement that uses ok(...)
        function hasReturnUsingOk(body) {
            if (!body) return false;
            // body may be a BlockStatement
            const bodyNode = body.type === 'BlockStatement' ? body : body;

            let found = false;

            // simple walker
            function walk(node) {
                if (!node || found) return;
                if (node.type === 'ReturnStatement') {
                    if (nodeContainsOkCall(node.argument)) {
                        found = true;
                        return;
                    }
                }

                for (const key of Object.keys(node)) {
                    if (key === 'parent' || key === 'range' || key === 'loc') continue;
                    const child = node[key];
                    if (Array.isArray(child)) {
                        for (const c of child) walk(c);
                    } else if (child && typeof child === 'object') {
                        walk(child);
                    }
                    if (found) return;
                }
            }

            walk(bodyNode);
            return found;
        }

        // Check method definition inside a class that is decorated with @Controller
        function isControllerClass(classNode) {
            if (!classNode || !Array.isArray(classNode.decorators)) return false;
            for (const dec of classNode.decorators) {
                // decorator can be Identifier (e.g. @Controller) or CallExpression (e.g. @Controller('route'))
                if (dec.expression) {
                    const expr = dec.expression;
                    if (expr.type === 'Identifier' && expr.name === 'Controller') return true;
                    if (expr.type === 'CallExpression' && expr.callee && expr.callee.type === 'Identifier' && expr.callee.name === 'Controller') return true;
                }
            }
            return false;
        }

        return {
            MethodDefinition(node) {
                // parent is ClassBody, parent.parent is the ClassDeclaration/Expression
                const classNode = node.parent && node.parent.parent;
                if (!classNode) return;
                if (!isControllerClass(classNode)) return;

                // Skip constructors and non-method kinds (getters/setters) and ensure method has a body
                if (node.kind === 'constructor' || node.kind === 'get' || node.kind === 'set') return;
                if (!node.value || !node.value.body) return;

                const usesOk = hasReturnUsingOk(node.value.body);
                if (!usesOk) {
                    context.report({ node: node.key, messageId: 'preferOk' });
                }
            },
        };
    },
};
