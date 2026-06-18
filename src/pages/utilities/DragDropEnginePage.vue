<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  UploadCloud, FolderInput, FolderOpen, Clipboard, X, Trash2, FileWarning, Plus, Eye,
  FileText, FileImage, FileVideo, FileArchive, File as FileIcon,
} from '@lucide/vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Button from '../../components/ui/Button/Button.vue';
import Badge from '../../components/ui/Badge/Badge.vue';
import FileSize from '../../components/ui/FileSize/FileSize.vue';
import Switch from '../../components/ui/Switch/Switch.vue';
import Slider from '../../components/ui/Slider/Slider.vue';
import { createDropZone } from '../../lib/drag-n-drop-engine/drag-n-drop-engine.js';

const ddIntro = 'createDropZone() funnels files from drop, paste and the file picker into one collection, validates each against your rules, tags every file accepted or rejected with a reason, optionally builds image previews, and emits that intake state. Intake only — no uploading.';
const ddPrinciples = ['Renders no UI', 'Intake only (no upload)', 'Binds element objects', 'Per-file accept / reject + reason', 'Optional image previews', 'Revokes its own URLs'];
const ddLegend = [
  { name: 'DropFile', desc: 'a tagged file { id, file, name, size, type, status, reason?, preview? }' },
  { name: 'DropState', desc: '{ files, accepted, rejected, isDraggingOver, willAccept, config } from getState()' },
];
const ddGroups = [
  {
    label: 'Create & options', icon: UploadCloud,
    methods: [
      { sig: 'createDropZone(options): DropZone', ret: 'DropZone', desc: 'options: { accept, minSize, maxSize, maxFiles, maxPerDrop, maxTotalSize, multiple = true, dedupe = false, preview = "none", validator, paste, onChange }.' },
      { sig: 'setOptions(patch): DropZone', ret: 'DropZone', desc: 'Patch the rules and re-validate every file.' },
    ],
  },
  {
    label: 'Element binding', icon: FolderInput,
    methods: [
      { sig: 'attach(target: HTMLElement): DropZone', ret: 'DropZone', desc: 'Wire native drag / drop (and optional paste) listeners to the element object — no selectors.' },
      { sig: 'detach(target?): DropZone', ret: 'DropZone', desc: 'Remove listeners for one target, or all.' },
      { sig: 'openPicker()', ret: 'void', desc: 'Open the OS file dialog.' },
    ],
  },
  {
    label: 'Collection', icon: Trash2,
    methods: [
      { sig: 'add(files, source?): DropFile[]', ret: 'DropFile[]', desc: 'Programmatically intake a FileList / File[].' },
      { sig: 'remove(id)', ret: 'boolean', desc: 'Remove one file (revoking its preview URL).' },
      { sig: 'clear(): DropZone', ret: 'DropZone', desc: 'Remove every file (revoking URLs); drag-state untouched.' },
    ],
  },
  {
    label: 'State & reads', icon: Eye,
    methods: [
      { sig: 'getState(): DropState', ret: 'DropState', desc: 'Accepted + rejected files, drag-over state and the active config.' },
      { sig: 'subscribe(callback)', ret: '() => void', desc: 'Push the snapshot on every change.' },
      { sig: 'readPreview(id)', ret: 'Promise<string | null>', desc: 'Lazily produce / read an image preview.' },
      { sig: 'readFile(id)', ret: 'Promise<string | null>', desc: 'Read a file as a data URL.' },
      { sig: 'destroy()', ret: 'void', desc: 'Remove listeners, revoke URLs and clear.' },
    ],
  },
];
const ddEnums = [
  { name: 'IntakeStatus', values: ['accepted', 'rejected'], note: 'Per-file verdict.' },
  { name: 'RejectReason', values: ['type', 'too-large', 'too-small', 'duplicate', 'custom', 'max-per-drop', 'max-files', 'max-total-size'] },
  { name: 'PreviewMode', values: ['none', 'object-url', 'data-url'], note: 'How an accepted image preview is produced.' },
  { name: 'Source', values: ['drop', 'paste', 'picker'], note: 'Where a file entered from.' },
];

const ACCEPT_PRESETS = {
  'images-pdf': { label: 'Images + PDF', accept: ['image/*', '.pdf'] },
  images: { label: 'Images only', accept: ['image/*'] },
  any: { label: 'Anything', accept: null },
};
const acceptKey = ref('images-pdf');
const minKB = ref(0);
const maxMB = ref(10);
const perDrop = ref(0);
const maxFiles = ref(8);
const maxTotalMB = ref(40);
const dedupe = ref(true);
const keepRejected = ref(true);
const wholePage = ref(false);

let dz = null;
const view = ref({ files: [], counts: { total: 0, accepted: 0, rejected: 0 }, totalSize: 0, drag: { isDraggingOver: false, willAccept: null, fileCount: null } });
const zoneEl = ref(null);

function ruleOptions() {
  return {
    accept: ACCEPT_PRESETS[acceptKey.value].accept,
    minSize: minKB.value > 0 ? minKB.value * 1024 : null,
    maxSize: maxMB.value > 0 ? maxMB.value * 1024 * 1024 : null,
    maxPerDrop: perDrop.value > 0 ? perDrop.value : null,
    maxFiles: maxFiles.value,
    maxTotalSize: maxTotalMB.value > 0 ? maxTotalMB.value * 1024 * 1024 : null,
    dedupe: dedupe.value,
    retainRejected: keepRejected.value,
  };
}

onMounted(() => {
  dz = createDropZone({ ...ruleOptions(), multiple: true, directory: true, preview: 'object-url', paste: true, onChange: (s) => (view.value = s) });
  dz.attach(zoneEl.value);
  view.value = dz.getState();
});
onBeforeUnmount(() => dz?.destroy());

watch([acceptKey, minKB, maxMB, perDrop, maxFiles, maxTotalMB, dedupe, keepRejected], () => { if (dz) dz.setOptions(ruleOptions()); });
watch(wholePage, (on) => { if (!dz) return; if (on) dz.attach(window); else dz.detach(window); });

let sampleN = 0;
function addSample() {
  const colors = ['#2A6FDB', '#64AA7D', '#D9A441', '#CD4B50'];
  const c = colors[sampleN % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="${c}"/></svg>`;
  dz.add([new File([svg], `generated-${++sampleN}.svg`, { type: 'image/svg+xml' })]);
}

const peeks = ref({});
async function peek(id, type) {
  if (peeks.value[id]) { const next = { ...peeks.value }; delete next[id]; peeks.value = next; return; }
  const buf = await dz.readFile(id, 'arrayBuffer');
  if (!buf) return;
  const bytes = new Uint8Array(buf);
  const head = Array.from(bytes.slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
  let textHead = '';
  if (type.startsWith('text/') || /json|svg|xml|csv/.test(type)) textHead = new TextDecoder().decode(bytes.slice(0, 120));
  peeks.value = { ...peeks.value, [id]: { size: bytes.length, head, textHead, dataUrlKB: Math.round((bytes.length * 4 / 3) / 1024) } };
}

function iconFor(type) {
  if (type.startsWith('image/')) return FileImage;
  if (type.startsWith('video/')) return FileVideo;
  if (type === 'application/pdf') return FileText;
  if (type.includes('zip') || type.includes('compressed')) return FileArchive;
  return FileIcon;
}

const acceptLabel = computed(() => ACCEPT_PRESETS[acceptKey.value].label);
const zoneState = computed(() => (!view.value.drag.isDraggingOver ? 'idle' : view.value.drag.willAccept === false ? 'reject' : 'accept'));
const liveZone = computed(() => ({ idle: 'border-border bg-input text-muted', accept: 'border-foreground bg-surface text-foreground', reject: 'border-destructive bg-destructive/10 text-destructive' }[zoneState.value]));
const presetEntries = Object.entries(ACCEPT_PRESETS).map(([k, p]) => ({ k, label: p.label }));
</script>

<template>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Drag n' Drop Engine</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A consumer of the headless file-intake engine. It receives files dragged in, pasted,
      picked (files <em>or</em> whole folders), or added from code; validates each against a
      live rule set with size, count, total-size, type and duplicate rules; de-dups; makes and
      revokes previews; and emits per-file accepted/rejected state with a reason. Change a rule
      and the engine re-checks every file. Intake only — getting files in, not uploading.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Drop, paste or browse for files into the zone — the engine validates each against the active rules, tags accepted / rejected with reasons, and builds previews; this page paints the list and the drag-over state.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Live intake</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div
              ref="zoneEl"
              role="button" tabindex="0" aria-label="Drop files here or browse"
              :class="['group relative flex flex-col items-center justify-center gap-3 rounded-large border-2 border-dashed px-6 py-10 text-center transition-colors duration-200', liveZone]"
              @click="dz.openPicker()"
              @keydown="(e) => (e.key === 'Enter' || e.key === ' ') && dz.openPicker()"
            >
              <span v-if="zoneState !== 'idle' && view.drag.fileCount" class="absolute right-3 top-3 rounded-full border border-current px-2 py-0.5 text-[10px] font-medium tabular-nums">{{ view.drag.fileCount }} file{{ view.drag.fileCount === 1 ? '' : 's' }}</span>
              <div :class="['grid size-12 place-items-center rounded-full border transition-colors duration-200', zoneState === 'reject' ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-background']">
                <FileWarning v-if="zoneState === 'reject'" class="size-icon-large" /><UploadCloud v-else class="size-icon-large" />
              </div>
              <div class="flex flex-col gap-1">
                <p class="text-sm font-medium">
                  <template v-if="zoneState === 'accept'">Drop to add {{ view.drag.fileCount || '' }} file{{ view.drag.fileCount === 1 ? '' : 's' }}</template>
                  <template v-else-if="zoneState === 'reject'">Some items aren't allowed</template>
                  <template v-else>Drag files here, or click to browse</template>
                </p>
                <p class="text-xs opacity-70">{{ acceptLabel }} · up to {{ maxFiles }} files · {{ maxMB }} MB each</p>
              </div>
              <div class="mt-1 flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" size="sm" @click.stop="dz.openPicker()"><FolderInput class="size-icon-small" /> Choose files</Button>
                <Button variant="secondary" size="sm" @click.stop="dz.openPicker({ directory: true })"><FolderOpen class="size-icon-small" /> Choose folder</Button>
                <Button variant="secondary" size="sm" @click.stop="addSample()"><Plus class="size-icon-small" /> Add in code</Button>
                <span class="inline-flex items-center gap-1.5 text-xs text-faint"><Clipboard class="size-icon-small" /> or paste</span>
              </div>
            </div>

            <template v-if="view.files.length">
              <div class="mt-5 flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs text-muted">
                  <span class="font-medium text-foreground">{{ view.counts.total }} file{{ view.counts.total === 1 ? '' : 's' }}</span>
                  <span class="text-faint">·</span><span class="text-success">{{ view.counts.accepted }} accepted</span>
                  <template v-if="view.counts.rejected"><span class="text-faint">·</span><span class="text-destructive">{{ view.counts.rejected }} rejected</span></template>
                  <span class="text-faint">·</span><span><FileSize :bytes="view.totalSize" /></span>
                </div>
                <Button variant="quiet" size="sm" @click="dz.clear()"><Trash2 class="size-icon-small" /> Clear all</Button>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div v-for="it in view.files" :key="it.id" :class="['group/item relative flex flex-col overflow-hidden rounded-large border bg-surface transition-colors', !it.accepted ? 'border-destructive/40' : 'border-border']">
                  <div class="flex h-24 items-center justify-center overflow-hidden border-b border-border bg-background">
                    <img v-if="it.preview" :src="it.preview" alt="" class="h-full w-full object-cover" />
                    <component :is="iconFor(it.type)" v-else :class="['size-icon-extra-large', !it.accepted ? 'text-destructive/70' : 'text-muted']" />
                  </div>
                  <div class="flex flex-col gap-1 p-2.5">
                    <span class="truncate text-xs font-medium text-foreground" :title="it.name">{{ it.name }}</span>
                    <div class="flex items-center justify-between gap-1.5">
                      <Badge v-if="!it.accepted" variant="destructive" class="gap-1"><FileWarning class="size-icon-extra-small" /> {{ it.message }}</Badge>
                      <template v-else>
                        <span class="text-xs text-faint"><FileSize :bytes="it.size" /></span>
                        <button type="button" class="inline-flex items-center gap-1 rounded-small px-1 text-[10px] text-muted transition-colors hover:text-foreground focus-visible:outline-none" @click="peek(it.id, it.type)"><Eye class="size-icon-extra-small" /> {{ peeks[it.id] ? 'Hide' : 'Peek' }}</button>
                      </template>
                    </div>
                    <div v-if="peeks[it.id]" class="mt-1 rounded-medium border border-border bg-input p-2 font-mono text-[10px] text-muted">
                      <p>{{ peeks[it.id].size }} bytes · ~{{ peeks[it.id].dataUrlKB }} KB as data URL</p>
                      <p class="mt-0.5 text-faint">hex: {{ peeks[it.id].head }}</p>
                      <p v-if="peeks[it.id].textHead" class="mt-0.5 truncate text-foreground/70">{{ peeks[it.id].textHead }}</p>
                    </div>
                  </div>
                  <button type="button" aria-label="Remove file" class="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-medium bg-overlay/60 text-foreground/80 opacity-0 backdrop-blur-sm transition-opacity duration-100 hover:bg-overlay/80 hover:text-foreground group-hover/item:opacity-100 focus-visible:opacity-100 focus-visible:outline-none" @click="dz.remove(it.id)"><X class="size-icon-small" /></button>
                </div>
              </div>
            </template>
            <p v-else class="mt-4 text-xs text-faint">No files yet — drag items onto the zone, choose files or a folder, paste an image, or add one from code.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Accept policy</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-x-10 gap-y-7 rounded-large border border-border bg-surface p-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2.5">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Accepted types</span>
                <div class="inline-flex overflow-hidden rounded-medium border border-border text-xs">
                  <button v-for="p in presetEntries" :key="p.k" type="button" :class="['flex-1 px-2.5 py-1.5 transition-colors', acceptKey === p.k ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="acceptKey = p.k">{{ p.label }}</button>
                </div>
                <p class="font-mono text-[11px] text-faint">{{ (ACCEPT_PRESETS[acceptKey].accept || ['*']).join(', ') }}</p>
              </div>

              <div class="flex flex-col gap-3">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Size per file</span>
                <div class="flex items-center gap-3"><span class="w-8 shrink-0 text-xs text-muted">Min</span><Slider v-model="minKB" :min="0" :max="500" :step="10" /><span class="w-14 shrink-0 text-right font-mono text-[11px] text-faint">{{ minKB }} KB</span></div>
                <div class="flex items-center gap-3"><span class="w-8 shrink-0 text-xs text-muted">Max</span><Slider v-model="maxMB" :min="1" :max="50" :step="1" /><span class="w-14 shrink-0 text-right font-mono text-[11px] text-faint">{{ maxMB }} MB</span></div>
              </div>

              <div class="flex flex-col gap-3">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Budgets</span>
                <div class="flex items-center gap-3"><span class="w-20 shrink-0 text-xs text-muted">Per drop</span><Slider v-model="perDrop" :min="0" :max="10" :step="1" /><span class="w-16 shrink-0 text-right font-mono text-[11px] text-faint">{{ perDrop || 'none' }}</span></div>
                <div class="flex items-center gap-3"><span class="w-20 shrink-0 text-xs text-muted">Total files</span><Slider v-model="maxFiles" :min="1" :max="20" :step="1" /><span class="w-16 shrink-0 text-right font-mono text-[11px] text-faint">{{ maxFiles }}</span></div>
                <div class="flex items-center gap-3"><span class="w-20 shrink-0 text-xs text-muted">Total size</span><Slider v-model="maxTotalMB" :min="0" :max="200" :step="10" /><span class="w-16 shrink-0 text-right font-mono text-[11px] text-faint">{{ maxTotalMB ? maxTotalMB + ' MB' : 'none' }}</span></div>
              </div>

              <div class="flex flex-col gap-3">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Rules</span>
                <label class="flex items-center justify-between"><span class="text-xs text-muted">Reject duplicates (name + size)</span><Switch v-model:checked="dedupe" /></label>
                <label class="flex items-center justify-between"><span class="text-xs text-muted">Keep rejected files in the list</span><Switch v-model:checked="keepRejected" /></label>
                <label class="flex items-center justify-between"><span class="text-xs text-muted">Whole-page drop target</span><Switch v-model:checked="wholePage" /></label>
              </div>
            </div>
            <p class="mt-4 text-xs text-faint">Every rule is pushed to the engine via <code class="text-[11px]">setOptions()</code>, which re-validates the collection in place — an accepted file can flip to rejected and back without re-dropping it.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="drag-n-drop-engine.js"
      :intro="ddIntro"
      :principles="ddPrinciples"
      :legend="ddLegend"
      :groups="ddGroups"
      :enums="ddEnums"
    />
  </div>

  <div v-if="wholePage && view.drag.isDraggingOver" class="pointer-events-none fixed inset-0 z-modal grid place-items-center bg-overlay/50 backdrop-blur-sm">
    <div class="flex flex-col items-center gap-3 rounded-large border-2 border-dashed border-foreground/60 bg-surface/80 px-12 py-10 text-foreground">
      <UploadCloud class="size-icon-extra-large" />
      <p class="text-sm font-medium">Drop anywhere to add files</p>
    </div>
  </div>
</template>
