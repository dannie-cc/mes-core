export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Validate permissions.ts definitions',
        },
        schema: [],
    },
    create(context) {
        return {
            VariableDeclarator(node) {
                if (node.id.name !== 'Permissions') return;

                const seen = new Set();

                function checkObject(obj) {
                    obj.properties.forEach((prop) => {
                        if (prop.value.type === 'Literal') {
                            const val = prop.value.value;

                            // Duplicate check
                            if (seen.has(val)) {
                                context.report({
                                    node: prop.value,
                                    message: `Duplicate permission '${val}' in permissions.ts`,
                                });
                            }
                            seen.add(val);

                            // Naming check
                            const re = /^[a-z_]+\.([a-z_]+)(\.[a-z_]+)?$/;
                            if (!re.test(val)) {
                                context.report({
                                    node: prop.value,
                                    message: `Permission '${val}' does not match semantic pattern resource.action(.extension)`,
                                });
                            }
                        }

                        if (prop.value.type === 'ObjectExpression') {
                            checkObject(prop.value);
                        }
                    });
                }

                // 🔑 unwrap & handle TS "as const"
                let init = node.init;
                if (init?.type === 'TSAsExpression' && init.expression.type === 'ObjectExpression') {
                    init = init.expression;
                }

                if (init && init.type === 'ObjectExpression') {
                    checkObject(init);
                }
            },
        };
    },
};
