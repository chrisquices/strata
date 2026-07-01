## Flow

Trigger this isolated flow only when the user says exactly `flow`. If this flow is already active in the current chat context and the user says exactly `next`, treat `next` as another trigger for this same flow and continue with the next unreviewed component. If this flow is already active in the current chat context and the user says exactly `next <number>` with a positive integer, repeat this same flow for that many next unreviewed components in alphabetical order. Do not run this whole flow for casual questions, implementation requests, ordinary code reviews, a named component request such as `review component class accordion`, or the separate `review component <component-name>` flow unless the user uses one of those exact trigger phrases. These are absolute rules, they are not guidelines or optional, they are REQUIRED and NON-OPTIONAL.

8. Comments that explain a single line of code should be inline comments on that same line, never comments above the line of code.
1. Determine the component to review by listing the direct child component folders in `src/components/ui` alphabetically and selecting the first component that is not already listed in `Reviewed component classes`.
2. Review the component implementation itself, not the component page, to find every practical opportunity to apply the design token system completely and consistently with all applicable tokens.
3. Review whether `cn` belongs in each component file independently — "one thoughtful `cn`" means one per `.vue` file, not one per component family. The deciding question is whether the component is consumer-facing: does the parent/consumer actually write this component in their template, and would they reasonably pass `class` to customize its styled output? Internal subcomponents that are only used inside the family (never written directly by the consumer) do not need `cn`. For each consumer-facing `.vue` file, suggest exactly one thoughtful parent-facing class merge point with `cn(defaultClasses, $attrs.class)` or the local equivalent. Put that `cn` on the most relevant painted/rendered element that a parent user would reasonably expect `class` to customize. Do not plaster `cn` onto every element or every static class string within a single file. Do not put `cn` on wrapper primitives that do not style or paint the actual HTML output, such as reka providers, roots, or `as-child` pass-through primitives where another inner element is the real styling surface. If the correct target is not the root element, suggest `defineOptions({inheritAttrs: false})`, intentional non-class attr forwarding with `v-bind="$attrs"` where appropriate, and merging `$attrs.class` only into the chosen element. If a component file has no meaningful class surface or should rely on normal Vue class fallthrough, recommend no `cn` and explain why in the finding.
4. Review every existing comment in the component being reviewed. Delete dead, unnecessary, obvious, or redundant comments immediately without waiting for confirmation. Keep comments that explain non-obvious behavior, browser/framework constraints, accessibility reasoning, or other useful implementation context.
5. After this review flow is triggered, do not edit any files, run automatic cleanup, or make implementation changes except for the comment deletion allowed above. Report design-token and `cn` findings first, wait for the user to confirm what to edit, and only then make the confirmed changes.
6. Output only a brief numbered list so the user can approve, reject, or ask about findings by number. Do not use bullets, paragraphs, summaries, praise, or explanations of things that are already correct.
7. After the user confirms edits, apply only the confirmed changes, run the documented build, and report the result.
8. After finishing a scan/sweep/fix, read this section AGAIN from new (not from memory) and go through all your changes and verify whether you followed through all these rules.
9. After the confirmed edits are complete and the component is finished, add the component name to `Reviewed component classes` in alphabetical order.
10. Report only things that are wrong, incorrect, broken, mistaken, or a typo. Never report, output, mention, restate, acknowledge, or even allude to anything that is correct, working, well-built, intentional, or fine — not as a finding, a verdict, a preamble, a reassurance, a confirmation, or an aside. No "no issues found", no "verified X is correct", no "this is right as written", no praise. If there is nothing wrong, output nothing except that there are no findings. The output is exclusively a list of defects.
11. Any computed const that returns a reasonably length single line code like this:
```
const pinnedOpen = computed(function () {
  return rootContext.isSingle.value && !rootContext.collapsible && itemContext.open.value;
});
```
should be trimmed to its shorter/arrow function version like so:
```
const pinnedOpen = computed(() => rootContext.isSingle.value && !rootContext.collapsible && itemContext.open.value);
```
11. read this specific guidelines for "review component flow" before every "next" to refresh your memory.
12. All of these rules in "review component flow" are absolute hard rules, apply them ruthlessly and with extreme precision.
13. In `<script>` sections of UI components, separate every top-level statement or block with a blank line. Consecutive import lines are the only exception — they stay grouped together with no blank lines between them. Everything else (`defineOptions`, `defineProps`, `defineModel`, `const` declarations, `computed`, `watch`, function definitions, etc.) gets a blank line above and below it.
14. In `<script>` sections of components, the top-level ordering must be: imports, `defineOptions()`, `const props = defineProps(...)`, `const baseClass = ...`, `const sizeClass = ...`, `const sizeText = ...`. Any code or logic not specified in this list stays where it is.
15. Do not use arrow functions. Use function declarations or regular function expressions instead. There are a few exceptions to when using arrow functions are allowed. for example
```
const props = defineProps({
  items: {
    type: Array as PropType<{ name?: string; src?: string }[]>, default: () => []
  },
```

```
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'sm',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value)
  },
```

```
.map((part) => [...part][0])
```

Reviewed component classes:

Accordion
AlertDialog
AspectRatio
Avatar
Badge
Banner
Breadcrumb
Button
Caption
Card
Checkbox
CheckboxGroup
Chip
CodeBlock
Collapsible
ColorPicker
Combobox
ContextMenu
DatePicker
