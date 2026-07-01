<script setup lang="ts">
import {RouterLink, useRoute, useRouter} from 'vue-router';
import {
  AlertCircle,
  AppWindow,
  ArrowDownUp,
  BellRing,
  Bone,
  Calculator,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CaseUpper,
  CheckSquare,
  ChevronsDownUp,
  ChevronsUpDown,
  Circle,
  CircleDot,
  CircleUser,
  Clock,
  Code2,
  Columns2,
  Ellipsis,
  FormInput,
  GitBranch,
  Grid3x3,
  Group,
  Hash,
  IdCard,
  KeyRound,
  Keyboard,
  Layers,
  LayoutTemplate,
  ListChecks,
  ListOrdered,
  ListTree,
  Loader2,
  LoaderCircle,
  Megaphone,
  Menu,
  MessageSquare,
  Minus,
  MousePointer,
  MousePointer2,
  MousePointerClick,
  Package,
  Palette,
  PanelRight,
  Pencil,
  Rows3,
  Scan,
  Slash,
  SlidersHorizontal,
  SquareMousePointer,
  Table,
  Tag,
  Tags,
  Text,
  TextCursorInput,
  TextSearch,
  ToggleLeft,
  ToggleRight,
  Type,
  UploadCloud,
  Video,
  Wrench,
} from '@lucide/vue';
import Sidebar from '@ui/Sidebar/Sidebar.vue';
import SidebarMenu from '@ui/Sidebar/SidebarMenu.vue';
import SidebarMenuItem from '@ui/Sidebar/SidebarMenuItem.vue';
import SidebarMenuSub from '@ui/Sidebar/SidebarMenuSub.vue';
import SidebarSection from '@ui/Sidebar/SidebarSection.vue';
import SidebarSectionCaption from '@ui/Sidebar/SidebarSectionCaption.vue';

const route = useRoute();
const router = useRouter();

const engineItems = [
  {id: 'drop-zone', label: 'Drop Zone', icon: UploadCloud},
  {id: 'video', label: 'Video', icon: Video},
];

const primitiveItems = [
  {id: 'aspect-ratio', label: 'Aspect Ratio', icon: Scan},
  {id: 'avatar', label: 'Avatar', icon: CircleUser},
  {id: 'badge', label: 'Badge', icon: Tag},
  {id: 'button', label: 'Button', icon: MousePointerClick},
  {id: 'caption', label: 'Caption', icon: CaseUpper},
  {id: 'checkbox', label: 'Checkbox', icon: CheckSquare},
  {id: 'chip', label: 'Chip', icon: Hash},
  {id: 'grid', label: 'Grid', icon: Grid3x3},
  {id: 'input', label: 'Input', icon: TextCursorInput},
  {id: 'kbd', label: 'Kbd', icon: Keyboard},
  {id: 'label', label: 'Label', icon: Type},
  {id: 'legend', label: 'Legend', icon: Type},
  {id: 'number-field', label: 'Number Field', icon: Calculator},
  {id: 'progress', label: 'Progress', icon: LoaderCircle},
  {id: 'separator', label: 'Separator', icon: Minus},
  {id: 'skeleton', label: 'Skeleton', icon: Bone},
  {id: 'slider', label: 'Slider', icon: SlidersHorizontal},
  {id: 'spinner', label: 'Spinner', icon: Loader2},
  {id: 'status-dot', label: 'Status Dot', icon: Circle},
  {id: 'switch', label: 'Switch', icon: ToggleRight},
  {id: 'textarea', label: 'Textarea', icon: Text},
  {id: 'toggle', label: 'Toggle', icon: ToggleLeft},
  {id: 'truncate-middle', label: 'Truncate Middle', icon: Ellipsis},
].sort(function (a, b) {
  return a.label.localeCompare(b.label);
});

const compositeItems = [
  {id: 'accordion', label: 'Accordion', icon: Rows3},
  {id: 'alert-dialog', label: 'Alert Dialog', icon: AlertCircle},
  {id: 'banner', label: 'Banner', icon: BellRing},
  {id: 'breadcrumb', label: 'Breadcrumb', icon: Slash},
  {id: 'card', label: 'Card', icon: LayoutTemplate},
  {id: 'checkbox-group', label: 'Checkbox Group', icon: ListChecks},
  {id: 'code-block', label: 'Code Block', icon: Code2},
  {id: 'collapsible', label: 'Collapsible', icon: ChevronsDownUp},
  {id: 'color-picker', label: 'Color Picker', icon: Palette},
  {id: 'combobox', label: 'Combobox', icon: TextSearch},
  {id: 'context-menu', label: 'Context Menu', icon: MousePointer2},
  {id: 'date-picker', label: 'Date Picker', icon: CalendarCheck},
  {id: 'dialog', label: 'Dialog', icon: MessageSquare},
  {id: 'dropdown-menu', label: 'Dropdown Menu', icon: Menu},
  {id: 'editable-text', label: 'Editable Text', icon: Pencil},
  {id: 'empty', label: 'Empty', icon: Package},
  {id: 'form', label: 'Form', icon: FormInput},
  {id: 'hover-card', label: 'Hover Card', icon: IdCard},
  {id: 'month-picker', label: 'Month Picker', icon: CalendarDays},
  {id: 'month-range-picker', label: 'Month Range Picker', icon: CalendarRange},
  {id: 'pagination', label: 'Pagination', icon: ListOrdered},
  {id: 'pin-input', label: 'Pin Input', icon: KeyRound},
  {id: 'popover', label: 'Popover', icon: SquareMousePointer},
  {id: 'radio-group', label: 'Radio Group', icon: CircleDot},
  {id: 'scroll-area', label: 'Scroll Area', icon: ArrowDownUp},
  {id: 'select', label: 'Select', icon: ChevronsUpDown},
  {id: 'sheet', label: 'Sheet', icon: PanelRight},
  {id: 'splitter', label: 'Splitter', icon: Columns2},
  {id: 'table', label: 'Table', icon: Table},
  {id: 'tabs', label: 'Tabs', icon: AppWindow},
  {id: 'tag-input', label: 'Tag Input', icon: Tags},
  {id: 'time-field', label: 'Time Field', icon: Clock},
  {id: 'timeline', label: 'Timeline', icon: GitBranch},
  {id: 'toast', label: 'Toast', icon: Megaphone},
  {id: 'toggle-group', label: 'Toggle Group', icon: Group},
  {id: 'toolbar', label: 'Toolbar', icon: Wrench},
  {id: 'tooltip', label: 'Tooltip', icon: MousePointer},
  {id: 'tree', label: 'Tree', icon: ListTree},
  {id: 'year-picker', label: 'Year Picker', icon: CalendarDays},
].sort(function (a, b) {
  return a.label.localeCompare(b.label);
});

const componentGroups = [
  {id: 'primitives', label: 'Primitives', icon: Layers, items: primitiveItems, defaultOpen: false},
  {id: 'composites', label: 'Composites', icon: Group, items: compositeItems, defaultOpen: false},
  {id: 'engines', label: 'Engines', icon: Wrench, items: engineItems, defaultOpen: true},
];

const menuSections = [
  {id: 'components', label: 'Components', groups: componentGroups},
];

function navigate(id: string, event: MouseEvent) {
  event.preventDefault();
  router.push(`/components/${id}`);
}
</script>

<template>
  <Sidebar aria-label="primary sidebar" class="md:w-72">
    <RouterLink to="/components" class="block">
      <div class="sticky top-0 z-10 p-6 bg-topbar border-b border-r border-border rounded-tl-xl">
        <p class="font-semibold leading-snug tracking-tight text-foreground">Strata UI</p>
        <p class="text-sm text-muted">Custom UI & Engine Kit</p>
      </div>
    </RouterLink>

    <SidebarSection
        v-for="section in menuSections"
        :key="section.id"
    >

      <SidebarSectionCaption>{{ section.label }}</SidebarSectionCaption>

      <SidebarMenu>
        <SidebarMenuItem
            v-for="group in section.groups"
            :key="group.id"
            :default-open="group.defaultOpen"
        >
          <template #icon>
            <component :is="group.icon" class="size-icon shrink-0" aria-hidden="true"/>
          </template>
          {{ group.label }}
          <template #submenu>
            <SidebarMenuSub align-icons>
              <SidebarMenuItem
                  v-for="item in group.items"
                  :key="item.id"
                  :href="`/components/${item.id}`"
                  :selected="route.path === `/components/${item.id}`"
                  @click="navigate(item.id, $event)"
              >
                <template #icon>
                  <component :is="item.icon" class="size-icon shrink-0" aria-hidden="true"/>
                </template>
                {{ item.label }}
              </SidebarMenuItem>
            </SidebarMenuSub>
          </template>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarSection>
  </Sidebar>
</template>
