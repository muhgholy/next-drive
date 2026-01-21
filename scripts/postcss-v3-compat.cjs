/**
 * PostCSS plugin to strip Tailwind v4-specific syntax for v3 compatibility
 */
module.exports = () => {
    return {
        postcssPlugin: 'postcss-v3-compat',
        Once(root) {
            // Remove @layer directives
            root.walkAtRules('layer', (rule) => {
                if (rule.nodes && rule.nodes.length > 0) {
                    // Replace @layer with its contents
                    rule.replaceWith(rule.nodes);
                } else {
                    // Remove empty @layer directives
                    rule.remove();
                }
            });

            // Remove @property declarations
            root.walkAtRules('property', (rule) => {
                rule.remove();
            });
        },
    };
};

module.exports.postcss = true;
