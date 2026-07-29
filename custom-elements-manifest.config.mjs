import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';
import { attributeTablePlugin } from './cem/attribute-table-plugin.mjs';

export default {
    globs: ['src/**/*.ts'],
    exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.d.ts'],
    outdir: '.',
    plugins: [
        // Must run before the editor-integration generators so they see the
        // attributes/events this plugin injects from ATTRIBUTE_TABLE.
        attributeTablePlugin(),
        customElementVsCodePlugin({ outdir: '.' }),
        customElementJetBrainsPlugin({ outdir: '.', packageJson: false }),
    ],
};
