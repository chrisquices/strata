import {
  compileScript,
  compileStyle,
  compileTemplate,
  parse,
  type SFCDescriptor,
} from "@deps/build/vue-compiler-sfc.js";

function stableId(filename: string) {
  let hash = 2166136261;

  for (const character of filename) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function assertSupportedStyles(descriptor: SFCDescriptor, filename: string) {
  for (const style of descriptor.styles) {
    if (style.src) {
      throw new Error(`${filename}: <style src> is not supported by the vendored Vue plugin`);
    }
    if (style.module) {
      throw new Error(`${filename}: CSS modules are not supported by the vendored Vue plugin`);
    }
    if (style.lang && style.lang !== "css") {
      throw new Error(`${filename}: style preprocessors must be compiled before the offline build`);
    }
  }
}

export const vuePlugin: Bun.BunPlugin = {
  name: "vue",
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      const { descriptor, errors } = parse(source, { filename: path });

      if (errors.length) {
        throw new AggregateError(errors, `Unable to parse ${path}`);
      }

      assertSupportedStyles(descriptor, path);

      const id = stableId(path);
      const scopeId = `data-v-${id}`;
      const hasScopedStyles = descriptor.styles.some((style) => style.scoped);

      let script = "const __sfc__ = {};";
      let bindings = {};

      if (descriptor.script || descriptor.scriptSetup) {
        const compiledScript = compileScript(descriptor, {
          id,
          genDefaultAs: "__sfc__",
        });
        script = compiledScript.content;
        bindings = compiledScript.bindings;
      }

      let template = "const render = undefined;";

      if (descriptor.template) {
        const compiledTemplate = compileTemplate({
          id,
          filename: path,
          source: descriptor.template.content,
          scoped: hasScopedStyles,
          compilerOptions: { bindingMetadata: bindings },
        });

        if (compiledTemplate.errors.length) {
          throw new AggregateError(compiledTemplate.errors, `Unable to compile template in ${path}`);
        }

        template = compiledTemplate.code.replace("export function render", "function render");
      }

      const css = descriptor.styles
        .map((style) => {
          const compiledStyle = compileStyle({
            id: scopeId,
            filename: path,
            source: style.content,
            scoped: style.scoped,
          });

          if (compiledStyle.errors.length) {
            throw new AggregateError(compiledStyle.errors, `Unable to compile styles in ${path}`);
          }

          return compiledStyle.code;
        })
        .join("\n");

      const styleSideEffect = css
        ? `
if (typeof document !== "undefined" && !document.querySelector('style[data-vue-sfc="${id}"]')) {
  const style = document.createElement("style");
  style.dataset.vueSfc = "${id}";
  style.textContent = ${JSON.stringify(css)};
  document.head.appendChild(style);
}`
        : "";

      const contents = `
${script}
${template}
__sfc__.render = render;
${hasScopedStyles ? `__sfc__.__scopeId = "${scopeId}";` : ""}
${styleSideEffect}
export default __sfc__;
`;

      const transpiler = new Bun.Transpiler({ loader: "ts", target: "browser" });
      return { contents: transpiler.transformSync(contents), loader: "js" };
    });
  },
};

export default vuePlugin;
