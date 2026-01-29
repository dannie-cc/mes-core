export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow raw strings in @RequiresPermissions decorator',
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                if (node.callee.name === 'RequiresPermissions') {
                    node.arguments.forEach((arg) => {
                        if (arg.type === 'Literal' && typeof arg.value === 'string') {
                            context.report({
                                node: arg,
                                message: `Use constant from permissions.ts instead of raw string '${arg.value}'`,
                            });
                        }
                    });
                }
            },
        };
    },
};
