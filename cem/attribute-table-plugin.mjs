/**
 * custom-elements-manifest analyzer plugin — attribute-table derivation.
 *
 * The element's ~56 observed attributes are declared only in the runtime
 * `ATTRIBUTE_TABLE` (and `NON_PICKER_ATTRIBUTES`) in `src/web-component.ts`,
 * which the analyzer reaches via `observedAttributes` → `ATTRIBUTE_TABLE.map(...)`
 * — a dynamic spread it cannot statically evaluate, so it emits ZERO attributes.
 *
 * This plugin reads those two arrays straight from the AST and injects the
 * attributes into the custom-element declaration, so there is a SINGLE source
 * of truth (the table) and the manifest can never drift from it. Enum union
 * types are resolved from the sibling `const … = [...] as const` arrays
 * (SELECTION_MODES, TRIGGERS, …); attribute descriptions are harvested from
 * the `DatePickerOptions` interface JSDoc in `src/types.ts`.
 *
 * The four dispatched events are likewise curated here — `date-select` and
 * `change` fire on the host; `custom-action` fires composed from inside the
 * shadow DOM and reaches the host. `drp-picker-activated` is deliberately
 * omitted: it is an internal broadcast on `document`, not an element event.
 */

const TAG = 'web-daterangepicker';

const NON_PICKER_TYPES = {
    'value': 'string',
    'placeholder': 'string',
    'disabled': 'boolean',
    'readonly': 'boolean',
    'enable-transitions': 'boolean',
    'input-size': "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
    'mobile-modal-breakpoint': 'number',
    'mobile-modal-min-height': 'number',
};

const NON_PICKER_DESCRIPTIONS = {
    'value': 'Current input value (the formatted date/range/time string).',
    'placeholder': 'Placeholder text for the input field (floating/modal modes).',
    'disabled': 'Disables the input and prevents opening the calendar.',
    'readonly': 'Renders the input read-only; selection via the calendar is still possible unless locked.',
    'enable-transitions': 'Enables CSS open/close transitions on the calendar popover.',
    'input-size': [
        'Input-field size (floating / modal modes only). Default: `md`.',
        '',
        '- `xs` — extra small',
        '- `sm` — small',
        '- `md` — medium (unstyled default)',
        '- `lg` — large',
        '- `xl` — extra large',
    ].join('\n'),
    'mobile-modal-breakpoint': 'Max viewport width (px) below which the picker switches to modal presentation.',
    'mobile-modal-min-height': 'Min viewport height (px) below which the picker switches to modal presentation.',
};

const EVENTS = [
    {
        name: 'date-select',
        type: { text: 'CustomEvent<SelectEventDetail>' },
        description: 'Fired when a selection is committed (single date, completed range, drag-adjust, or Apply). detail carries date/dateRange/formattedValue plus mode-specific enabled/disabled data.',
    },
    {
        name: 'change',
        type: { text: 'CustomEvent<SelectEventDetail>' },
        description: 'Mirror of `date-select` for form-style listeners. Same detail payload.',
    },
    {
        name: 'custom-action',
        type: { text: 'CustomEvent<CustomActionEventDetail>' },
        description: "Fired (composed, crossing the shadow boundary) when a custom action button is clicked. detail = { data: the button's data-* map, picker: the DateRangePicker instance }.",
    },
];

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// Preserve intentional line breaks (so multiline JSDoc renders as markdown —
// lists, paragraphs — in the editor hover) while tidying per-line whitespace.
const normalizeDoc = (s) =>
    s.replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

function readJsDoc(node) {
    const docs = node.jsDoc;
    if (!docs || !docs.length) return undefined;
    const c = docs[docs.length - 1].comment;
    if (typeof c === 'string') return normalizeDoc(c);
    if (Array.isArray(c)) return normalizeDoc(c.map((p) => p.text || '').join(''));
    return undefined;
}

/** Strip a wrapping `<expr> as const` / `as T` to reach the underlying array literal. */
function unwrapAs(ts, node) {
    while (ts.isAsExpression(node)) node = node.expression;
    return node;
}

function allStringLiterals(ts, arr) {
    return arr.elements.length > 0 && arr.elements.every((e) => ts.isStringLiteral(e));
}

export function attributeTablePlugin() {
    // Collected across analyzePhase of ALL modules, applied in packageLinkPhase.
    const enums = {};        // { SELECTION_MODES: ['single','range','multiple'], ... }
    const tableEntries = []; // { attr, key, parserName, enumRef }
    const nonPickerAttrs = []; // ['value', 'placeholder', ...]
    const optionDocs = {};   // { selectionMode: 'JSDoc text', ... }

    return {
        name: 'drp-attribute-table',

        analyzePhase({ ts, node }) {
            // Harvest DatePickerOptions member JSDoc for attribute descriptions.
            if (ts.isInterfaceDeclaration(node) && node.name.getText() === 'DatePickerOptions') {
                for (const member of node.members) {
                    if (!member.name) continue;
                    const doc = readJsDoc(member);
                    if (doc) optionDocs[member.name.getText()] = doc;
                }
                return;
            }

            if (!ts.isVariableStatement(node)) return;
            for (const decl of node.declarationList.declarations) {
                if (!decl.initializer || !decl.name) continue;
                const name = decl.name.getText();
                const init = unwrapAs(ts, decl.initializer);

                if (name === 'ATTRIBUTE_TABLE' && ts.isArrayLiteralExpression(init)) {
                    for (const el of init.elements) {
                        if (!ts.isObjectLiteralExpression(el)) continue;
                        const entry = {};
                        for (const prop of el.properties) {
                            if (!ts.isPropertyAssignment(prop)) continue;
                            const pname = prop.name.getText();
                            const val = prop.initializer;
                            if (pname === 'attr' && ts.isStringLiteral(val)) entry.attr = val.text;
                            else if (pname === 'key' && ts.isStringLiteral(val)) entry.key = val.text;
                            else if (pname === 'parser') {
                                if (ts.isCallExpression(val)) {
                                    entry.parserName = val.expression.getText();
                                    if (val.arguments.length) entry.enumRef = val.arguments[0].getText();
                                } else {
                                    entry.parserName = val.getText();
                                }
                            }
                        }
                        if (entry.attr && entry.key) tableEntries.push(entry);
                    }
                } else if (name === 'NON_PICKER_ATTRIBUTES' && ts.isArrayLiteralExpression(init)) {
                    for (const el of init.elements) {
                        if (ts.isStringLiteral(el)) nonPickerAttrs.push(el.text);
                    }
                } else if (ts.isArrayLiteralExpression(init) && allStringLiterals(ts, init)) {
                    // A `const FOO = ['a','b'] as const` enum-values array.
                    enums[name] = init.elements.map((e) => e.text);
                }
            }
        },

        packageLinkPhase({ customElementsManifest }) {
            const typeFor = (entry) => {
                const p = entry.parserName || '';
                if (p === 'parseEnum') {
                    const vals = enums[entry.enumRef];
                    if (vals) return vals.map((v) => `'${v}'`).join(' | ');
                    return 'string';
                }
                if (p === 'parseWeekStartDay') return "'auto' | '0' | '1' | '2' | '3' | '4' | '5' | '6'";
                if (/Int/.test(p)) return 'number';
                if (/Bool/.test(p)) return 'boolean';
                return 'string'; // string / pipe-list / disabled-dates / disabled-weekdays
            };

            for (const mod of customElementsManifest.modules || []) {
                for (const decl of mod.declarations || []) {
                    if (!(decl.customElement && decl.tagName === TAG)) continue;

                    const memberNames = new Set((decl.members || []).map((m) => m.name));
                    const attributes = [];

                    for (const e of tableEntries) {
                        const a = { name: e.attr, type: { text: typeFor(e) } };
                        if (optionDocs[e.key]) a.description = optionDocs[e.key];
                        if (memberNames.has(e.key)) a.fieldName = e.key;
                        attributes.push(a);
                    }

                    for (const name of nonPickerAttrs) {
                        const a = { name, type: { text: NON_PICKER_TYPES[name] || 'string' } };
                        if (NON_PICKER_DESCRIPTIONS[name]) a.description = NON_PICKER_DESCRIPTIONS[name];
                        const field = kebabToCamel(name);
                        if (memberNames.has(field)) a.fieldName = field;
                        attributes.push(a);
                    }

                    decl.attributes = attributes;
                    decl.events = EVENTS;
                }
            }
        },
    };
}
