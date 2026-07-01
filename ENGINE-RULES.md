# rules.md: Absolute Rules

These are not suggestions, guidelines, preferences, or best practices. They are authoritative, non-negotiable laws that you (the agent) must read and obey without exception, every turn. This file is self-contained: it depends on no other document, and it names no project-specific file except where a rule's entire subject is that file.

## Enforcement protocol

- The instant you are about to violate a rule, or are asked to violate one, **stop and defer to the user** instead of pressing ahead.
- Never rationalize, justify, soften, or "just wrap up first" to slip past a rule. Nothing outranks this: no exception, no override, no competing priority.
- When you must stop mid-task, finish only the current atomic edit first so nothing is left half-changed or broken; do not start the next step.
- A small slip you catch yourself: fix it and note what you fixed, then carry on. A genuine conflict with the user's intent, or anything you can't cleanly resolve: **halt and wait** until the user sends another message.
- On resuming, the rules stay fully in force; if you are about to break one again, stop again, every time.

## Comments

- Comment uncommon or non-obvious lines inline, right next to the code they explain; leave common, well-understood idioms bare. The test: if an average developer wouldn't know what the line does or why it's there, comment it; otherwise leave it bare. When the same idiom appears in several places for different reasons, give each occurrence a different trailing comment stating that spot's reason.
- Put a blank line above every standalone (own-line) comment (**no exceptions**), except a comment on the literal first line of the file. Inline trailing comments are exempt; they sit on the code's own line.

  ```js
  // Do: blank line above the standalone comment:
  const url = makeUrl(file);

  // Build the preview for the item.
  const preview = buildPreview(url);

  // Don't: the comment butts against the line above it:
  const url = makeUrl(file);
  // Build the preview for the item.
  const preview = buildPreview(url);
  ```
- For a continuous run of lines (e.g. several variable initialisations in a row), give each its own inline trailing comment on its own line; never stack a single block comment above the group; a block above a group is hard to map back to each line.

  ```js
  // Do: one trailing comment per line:
  const items = []; // everything collected so far
  let ready = false; // becomes true once setup finishes
  const seen = new Set(); // keys already processed, to skip duplicates

  // Don't: one block above the group (which line is which?):

  // the items list, the ready flag, and the seen set
  const items = [];
  let ready = false;
  const seen = new Set();
  ```
- A block comment above a single cohesive unit (one function, one section/step header) is fine; keep that top comment to a short label of what the block is, and attach any "why" inline to the specific surprising line. Put rationale where its scope is: a trailing comment justifies the exact line it sits on; a leading comment introduces the block below it.

  ```js
  // Do: short label on top, the "why" inline on the surprising line:

  // Add every row to the cache.
  function cacheRows(rows) {
      for (const row of rows) {
          cache.push(row); // a plain loop; push(...rows) can overflow the argument-count limit on a huge batch
      }
  }

  // Don't: the top block narrates the body, leaving the surprising line bare:

  // Add the rows. We use a plain for-of loop instead of push(...rows) because spreading a
  // very large array into push() can exceed the maximum argument count and throw.
  function cacheRows(rows) {
      for (const row of rows) {
          cache.push(row);
      }
  }
  ```
- Write longer "why" comments as full capitalized sentences with terminal punctuation; write short trailing line-notes as lowercase fragments with no period. The two registers signal block-scope vs line-scope at a glance.
- A banner comment is a section-divider header: a Title-Case label followed by a long ruler of dashes, forming the `//#region` / `//#endregion` pair that frames (and folds) a region. Extend the ruler to fill exactly to column 120 accounting for indentation: at the standard 4-space indent that is exactly 113 dashes, minus 4 fill characters per additional nesting level. Pad only the pure ruler lines, never the label/text between them.

  ```text
  //#region Generic Helpers ----------------------------------------------------------------------------------------------

  //#endregion -----------------------------------------------------------------------------------------------------------

      //#region Utility --------------------------------------------------------------------------------------------------

      //#endregion -------------------------------------------------------------------------------------------------------
  ```
  (Nested 4 spaces in → ruler is 4 dashes shorter, so the right edge still lands on column 120.)
- Never reword, rewrite, or cosmetically "improve" any comment: author and AI comments are indistinguishable, so treat every comment as untouchable by default. The sole reason a comment may change is that the logic it describes is being updated and the comment would otherwise go stale; preserve its exact wording in every other case. When you do change a comment because its related logic changed, explicitly tell the user the comment was updated and why. Goal: no cosmetic edits, and no stale comments; comments must always match the code they sit on.

## Naming

- Name methods and variables so they read like natural English, in the spirit of Laravel's Eloquent (Taylor Otwell's expressive, sentence-like naming); a reader should be able to say the code aloud and have it make sense. Favour clarity over brevity: a longer self-explaining name beats a short opaque one.

  ```js
  cartContainsItem(item)   // reads aloud: "cart contains item"
  sendWelcomeEmail()
  loadProfile(userId)
  ```
- Prefer full, self-explaining words, but established, universally-understood dev abbreviations are fine: the bar is "any developer instantly recognises it," which includes technical conventions, not only plain-English terms. Acceptable without spelling out: `i` (loop index), `x`/`y`/`z`, `tmp`/`temp`, `md`, `js`, `deps`, `src`, and the like. Don't invent cryptic or domain-local abbreviations a reader has to decode.

  ```js
  // Fine: universally understood in dev:
  for (let i = 0; i < items.length; i++) { /* … */ }
  const tmp = render();   // also: x / y / z, md, js, deps, src

  // Avoid: cryptic or domain-local, decode-on-read:
  function (usr) { /* … */ }   // spell it out: user
  const cfg = loadConfig();    // spell it out: config
  ```
- Name a function for what it does: anything performing work (especially asynchronous, or that reads/walks/transforms) begins with a meaningful verb, paired with its concrete object; where work happens in stages, give each stage its own distinct verb on the shared noun. Avoid the filler verb `get` for anything beyond a trivial synchronous accessor; it disguises real work (and a returned Promise) as a cheap property fetch.

  ```js
  loadProfile(id)   parseConfig(text)   fetchOrders()   // work → leading verb
  getName()                                            // trivial sync read → "get" allowed only here
  ```
- Write a boolean predicate so it reads as a yes/no statement: subject first, or with an `is`/`has`/`can`/`contains` prefix; never a bare adjective.

  ```js
  if (userIsAdmin) { /* … */ }   // reads as a yes/no statement
  if (cartHasItems) { /* … */ }

  // avoid:  if (adminUser) …    ← bare adjective
  ```
- Name the object a function acts on, except when the object is the receiver you call it on: a method on the returned instance stays bare (the receiver already names the object); a standalone function names its object; keep a method's noun when there's no receiver to lean on.

  ```js
  // Method on the returned handle: the receiver already names the object, so keep the verb bare:
  connection.close();        // not  connection.closeConnection()
  cart.addItem(item);        // not  cart.addItemToCart(item)

  // Standalone function: no receiver to lean on, so it names its object:
  loadProfile(userId);       // not  load(userId)
  ```
- Name a callback for the event that happened (not vaguely), and an internal transition for the externally-driven thing that happened, not with an agency verb (`activate`, `start`, `enable`) that implies the code causes it. Use `onXChange` for a state-change callback that hands back the new value.

  ```js
  onUploadComplete(result)   // named for the event that happened
  onSelectionChange(value)   // onXChange, handed the new value

  // avoid:  onUpload(...)        ← too vague

  // avoid:  activatePanel(...)   ← agency verb for state the code only reflects
  ```
- When pairing words for a state, pick two instantly-recognizable opposites; a reader should see at a glance that the two belong together. Avoid a pairing whose words aren't obviously each other's opposite.

  ```js
  enter / leave      open / close      enable / disable      lock / unlock   // instantly-paired opposites

  // avoid:  enable / reset      start / clear                              ← the two don't read as an obvious pair
  ```
- Name produce/consume pairs with matching tense (present-tense producer, past-participle result), carrying singular/plural and -ed/-ing at every nesting level.

  ```js
  const collectedRows = collectRows();          // produce (verb) → result (past participle)
  const extractedGroups = extractGroups(node);  // plural producer → plural result

  // one level down, the singular mirrors it: extractGroup() → extractedGroup
  ```

## Functions & closures

- Never use arrow functions; always use the `function` keyword for declarations, handlers, callbacks (`map`/`then`/`forEach`), Promise executors, `setTimeout` bodies, the returned unsubscribe, everything. No exceptions.

  ```js
  element.addEventListener("click", function (event) { /* … */ });   // always the function keyword
  items.map(function (item) { /* … */ });

  // never:  (event) => { … }        item => …
  ```
- Wrap logic in named functions generously, even one-off wrappers called once. "Less code is better" applies to logic, not to wrapper functions; wrapper ceremony is welcome: named functions are collapsible and easy to scan. The payoff isn't reuse (that's DRY's job); it's readability: the name documents intent, folds away, and turns the file into a scannable list of names.

  ```js
  // Do: wrap it in a named function, even though it's two lines used in only a few spots:
  function reset() {
      count = 0;
      clearTimer();
  }

  // …each call site then reads as intent and collapses to one line:
  reset();

  // Don't: inline the body at every call site to "save the function":
  count = 0;
  clearTimer();   // repeated at several call sites; unnamed, not collapsible, intent hidden
  ```
- Build an entire instance inside a single factory closure: all per-instance state and every function reading it nested inside; only pure, stateless helpers at module scope. No `this`, no class, no shared globals.
- Give each event-listener registration its own named wiring function, with any option gate living inside that function; a flat call-list near the end wires them all and reads as a table of contents. Group guards that share one concern into a single wiring function; split one-per-listener only when the listeners are independently meaningful.

  ```js
  function listenForClick() {
      if (clickable) registerListener(element, "click", onClick); // the gate lives inside
  }

  // …then a flat call-list near the end reads as a table of contents:
  listenForClick();
  listenForResize();
  listenForKeydown();
  ```
- Prefer a named inner function for any callback that recurses, is reused, or carries real logic; keep a trivial one-line delegation callback anonymous. Pass an already-named function directly as a callback when the signatures line up, rather than re-wrapping it.
- Hand a bare named function as the fulfillment handler and an inline function as the rejection handler in the SAME two-argument `.then` (not `.then().catch()`), so the catch is scoped to that operation only.

  ```js
  collect(source).then(commit, function (error) { // rejection is the 2nd arg, scoped to collect() only
      report(error);
  });

  // not:  collect(source).then(commit).catch(report)  // .catch would also swallow errors thrown inside commit
  ```
- Write a two-branch `if/else` only when both branches assign the same variable different values; everywhere else use a guard-return/continue cascade. Express multi-way dispatch as a top-to-bottom cascade of guarded returns, each braced, ending in a final `return null`.

  ```js
  // if/else only when both arms set the SAME variable:
  if (durationIsUsable) {
      seekTime = Math.min(3, duration / 2);
  } else {
      seekTime = 0.1;
  }

  // multi-way dispatch: a cascade of guarded returns, each braced, ending in a final return null:
  function previewFor(file) {
      if (file.type.startsWith("image/")) {
          return makeImagePreview(file);
      }
      if (file.type.startsWith("video/")) {
          return makeVideoPreview(file);
      }
      return null;
  }
  ```
- Build a configured node with one `Object.assign(create(...), { … })`, mixing shorthand and explicit keys, never create-then-mutate across statements.

  ```js
  const input = Object.assign(create("input"), {
      type: "file", // explicit key: a fixed value
      multiple,     // shorthand: a verbatim option passthrough
  });

  // not:  const input = create("input"); input.type = "file"; input.multiple = multiple;  (create-then-mutate)
  ```
- Let a mutator return a meaningful boolean (did anything change) only where the caller can act on it; let a pure-side-effect/idempotent mutator return undefined.

  ```js
  function remove(item) {
      const index = items.indexOf(item);
      if (index === -1) {
          return false; // not present: a miss the caller can act on
      }

      items.splice(index, 1);
      return true;
  }

  function clear() {
      items.length = 0; // idempotent: nothing meaningful to report, so return undefined
  }
  ```
- Don't mark a function `async` pointlessly, but `async` earns its place two ways: its body actually awaits, OR it has mixed sync and async branches and `async` normalizes them into one uniform Promise (it wraps a plain return and adopts a returned Promise for free, so reach for it over hand-rolled `Promise.resolve` wrapping even with no `await`). A `new Promise(...)` executor that never awaits stays plain.

  ```js
  async function loadAll(urls) {
      return await Promise.all(urls.map(loadOne)); // body awaits → async
  }

  // no await, but async normalizes the mixed branches into one Promise<string | null>:
  async function buildPreview(item) {
      if (item.isImage) return makeUrl(item); // a plain string
      if (item.isVideo) return capturePreview(item); // a Promise
      return null;
  }

  function makeThumbnail(file) {
      return new Promise(function (resolve) { /* … */ }); // hand-rolled executor, never awaits → plain
  }
  ```

## Structure & layout

- Group related logic into cohesive, well-scoped domains, one per banner/region (each region is a domain). Keep all of a domain's logic together and scope it tightly. Don't expect strict top-to-bottom dependency/call order; functions reference each other both ways, and regions organize by domain, not by call sequence.
- Within a region, lead with its state declarations, then the behavior that mutates them, so the high-level orchestrator lands at the region's end. Order public methods before the private machinery, but place a data-shape factory immediately before its heaviest consumer, not up with the other helpers.
- After all regions are defined, do setup as a flat tail block: a bare call-list of every wiring function in event-lifecycle order. Close the factory with a return object that's a flat handle of bare-name references only (no wrappers), doubling as the public API and a one-glance manifest of the surface.

  ```js
  return {
      open,
      close,
      reset,
      subscribe,
      destroy,
  };
  ```
- End the options region by destructuring all options with inline defaults, then one validate call immediately.

  ```js
  const {size = 16, label = "", strict = false} = options; // all options destructured, with inline defaults
  validateOptions(); // one validate call, immediately; everything below trusts the values
  ```
- Keep code thin and readable; don't cram. A single-statement `if` belongs on one line when the body returns a single thing or nothing, or makes one call (condition complexity does not matter): a bare `return;`, a `return` of one atom (a literal like `false`/`null`/`undefined`, a single variable, or a single call like `foo()`), or one call statement (`if (cond) cleanup();`). That form is wanted, not a violation. Brace it on its own line when the return carries a composite (an object or array literal `{…}`/`[…]`, or a compound expression like `a + b` or `a ? b : c`), or when the body has two or more statements. Never cram into an inline `if`; prefer a sequence of clearly-commented blocks one below another over dense one-liners.

  ```js
  // Fine inline: nothing, one atom (literal / variable / single call), or one call:
  if (destroyed) return;
  if (index === -1) return false;
  if (a && b && c) return null;
  if (cache.has(key)) return cache.get(key);
  if (disabled) cleanup();

  // Braced: a composite return (object/array literal, or a compound expression), or a body of two or more statements:
  if (destroyed) {
      return {ok: false, items: []};
  }
  if (destroyed) {
      doSomething();
      doSomethingElse();
  }
  ```
- Author libraries in plain JavaScript (ESM); no TypeScript, no type annotations during development. JSDoc may be added only after a library is finished.
- Stay narrow: do not refactor, abstract, or fragment speculatively or on reflex; do it only when you have genuinely reasoned it through. The user drives most refactoring; your role is the initial, foundational structure, not ongoing refactors. When unsure, leave the code as-is and surface the option rather than reshaping it yourself.
- Apply DRY only when the same logic recurs across different AREAS of the code; do not extract a tight run of co-located verbatim sibling lines just to save lines, and do not flag co-located repetition as a DRY defect.

## Validation & contracts

- Validate all configuration at the boundary, once, and fail loud: throw a clear, prefixed error at creation time rather than silently no-opping or crashing later.

  ```js
  throw new TypeError("createWidget: the 'size' option must be a positive number.");
  ```
- Fail loud on malformed config shape/type, but do not babysit valid-but-contradictory developer misconfiguration. Give a contract; the dev obeys, and the contradictory result is correct. Require the documented input format; do not silently normalize a malformed value for the developer; they do the extra work.
- Validate a constructor's primary argument with a duck-typed capability check (e.g. `typeof x.someMethod === "function"`), not `instanceof`, so it works across realms/iframes.

  ```js
  if (typeof element.addEventListener !== "function") {
      throw new TypeError("createWidget: 'element' must be a DOM element.");
  }

  // not:  if (!(element instanceof HTMLElement))  // breaks for an element from another document/iframe
  ```
- Use `typeof x !== "boolean"` for options WITH a destructure default; `x !== undefined && <malformed>` for options with NO default; the presence guard encodes defaultedness. Match the numeric predicate to the quantity: `Number.isInteger` for a count, `Number.isFinite` for sizes; word the error to match.
- Validate cross-field consistency only after each field has individually passed, stating the relationship plainly.
- Downstream, trust exactly what the boundary validated: branch with the cheapest bare check (the raw boolean for a flag, a truthy guard for an optional limit, since validation already forbade 0), and don't re-check `!== undefined` or re-establish what validation already guaranteed; a guard for something the boundary did not cover is still legitimate.
- Use early-return guards at the top for not-applicable / already-in-state / nothing-to-do cases, each with a short trailing comment naming the case, so the body runs unindented on the real path.
- Return a defensive copy of any owned collection crossing the boundary, never the live array.

  ```js
  function items() {
      return owned.slice(); // a copy: callers can't mutate the live collection
  }
  ```
- Surface every error or rejection through one local factory returning a uniform shape: a stable kebab-case `id` the developer matches on (branching/i18n) plus a polished, properly-written user-facing message (real users read it, so not amateur-sounding). One factory per lib so the shape can't drift across the file.

  ```js
  function problem(id, message) {
      return {id: id, message: message};
  }
  problem("invalid-input", "That value isn't allowed.");
  ```
- Distinguish a value-check failure (an `if`-return on a `null` return) from a throwing-op failure (`try/catch`), coding each to its mechanism but routing both to the same neutral fallback.

  ```js
  const context = canvas.getContext("2d");
  if (!context) {
      return fallback(); // value-check: getContext returns null, never throws
  }

  try {
      context.drawImage(video, 0, 0); // throwing op: drawImage can throw, so try/catch
  } catch {
      return fallback();
  }
  ```

## Resource & async lifecycle

- Funnel every consumer-supplied callback through a try/catch isolation wrapper; never call one directly: a throwing subscriber must not abort an in-progress update or starve other subscribers, and the error surfaces to the console.

  ```js
  function callConsumer(callback, argument) {
      try {
          callback(argument);
      } catch (error) {
          console.error("createWidget: a consumer callback threw:", error);
      }
  }
  ```
- Set one `destroyed` flag and guard every state-mutating/async re-entry point so it returns a neutral value (matching the function's empty-but-valid contract) when destroyed. Place the guard ABOVE any memoization-cache hit so a torn-down instance never returns a stale cached resource.
- Never attach a listener with a bare `addEventListener`; route every one through a register-and-track helper that attaches and pushes a matching detach closure in the same breath, so you can't add one without recording how to remove it.
- Create every node via the host document the instance was given (never a global), and scope document/window listeners to that same document/window, so the code works inside iframes and across realms.

## Scope & process

- Frequently work in propose-then-approve mode: output proposed code in chat only and do not edit the file until the user says to add it.
- When reviewing, comment only on the subtask currently being worked on; ignore incidental, unrelated edits the user makes while tinkering; the one exception is something that hard-breaks the current task.
- Do not list something as a con/negative until you've reasoned through why it's actually a defect; surface asymmetry, inconsistency, or relocatability is not automatically a negative. If it's correct, intentional, or merely taste, do not list it as a con (at most note it neutrally).
- Surface design/naming/convention/scope decisions for the user to make rather than deciding unilaterally; act as the executor of the user's decisions and welcome heavy steering rather than resisting it.
- When the user states an absolute rule, stop and follow it immediately without substituting alternatives; when the user wants only pending/missing/issues/fixes, output only those and stop talking about resolved things.

## Misc

- Favor lean, comprehensible solutions the user can hold in their head, read, own, and maintain over capable-but-opaque or maximal output; do not hand them a black box. The bar for the personal libs: correct, readable, owned/maintainable, and feature-right, not maximal, and not test coverage.
- Treat the user as a capable dev but a junior/learner on the specific topic being taught: be patient and thorough, use examples and analogies, split into useful paragraphs (don't word-bomb), and teach while building. Keep explanations simple and short when asked.
- Use a classic indexed `for` loop only where the iterable may not be a real Array; `for...of` for genuine arrays/Sets/Maps and `.forEach`/`.map`/`.reduce` for transforms; the loop form signals the collection's type.
- Use object-literal shorthand for closed-over names in a public handle or config, but explicit `key: value` in internal data-shape factories; the redundancy marks "this is the contract" vs "just plumbing". Destructure a just-returned result with shorthand at the call site even though the producer returned it longhand.
- Use a bare `catch {` when the caught error is discarded; reserve `catch (error)` for when the value is actually used/logged.
- Break a long string/expression across lines at the ternary operators (`?`/`:` leading the continuation lines) only when the one-line form is unwieldy; keep short ternaries inline, and comment each arm of a line-broken ternary on its own line.
