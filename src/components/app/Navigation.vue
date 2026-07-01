<script setup lang="ts">
import type {Component} from 'vue';
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
import SidebarHeader from '@ui/Sidebar/SidebarHeader.vue';
import SidebarMenu from '@ui/Sidebar/SidebarMenu.vue';
import SidebarMenuItem from '@ui/Sidebar/SidebarMenuItem.vue';
import SidebarSection from '@ui/Sidebar/SidebarSection.vue';
import SidebarSectionCaption from '@ui/Sidebar/SidebarSectionCaption.vue';

type NavigationItem = {
  id: string;
  label: string;
  icon: Component;
  path?: string;
  disabled?: boolean;
};

type NavigationSection = {
  id: string;
  label: string;
  items: NavigationItem[];
};

const route = useRoute();
const router = useRouter();

const componentItems = [
  {id: 'accordion', label: 'Accordion', icon: Rows3, path: '/components/accordion'},
  {id: 'alert-dialog', label: 'Alert Dialog', icon: AlertCircle, path: '/components/alert-dialog'},
  {id: 'aspect-ratio', label: 'Aspect Ratio', icon: Scan, path: '/components/aspect-ratio'},
  {id: 'avatar', label: 'Avatar', icon: CircleUser, path: '/components/avatar'},
  {id: 'badge', label: 'Badge', icon: Tag, path: '/components/badge'},
  {id: 'banner', label: 'Banner', icon: BellRing, path: '/components/banner'},
  {id: 'breadcrumb', label: 'Breadcrumb', icon: Slash, path: '/components/breadcrumb'},
  {id: 'button', label: 'Button', icon: MousePointerClick, path: '/components/button'},
  {id: 'caption', label: 'Caption', icon: CaseUpper, path: '/components/caption'},
  {id: 'card', label: 'Card', icon: LayoutTemplate, path: '/components/card'},
  {id: 'checkbox', label: 'Checkbox', icon: CheckSquare, path: '/components/checkbox'},
  {id: 'checkbox-group', label: 'Checkbox Group', icon: ListChecks, path: '/components/checkbox-group'},
  {id: 'chip', label: 'Chip', icon: Hash, path: '/components/chip'},
  {id: 'code-block', label: 'Code Block', icon: Code2, path: '/components/code-block'},
  {id: 'collapsible', label: 'Collapsible', icon: ChevronsDownUp, path: '/components/collapsible'},
  {id: 'color-picker', label: 'Color Picker', icon: Palette, path: '/components/color-picker'},
  {id: 'combobox', label: 'Combobox', icon: TextSearch, path: '/components/combobox'},
  {id: 'context-menu', label: 'Context Menu', icon: MousePointer2, path: '/components/context-menu'},
  {id: 'date-picker', label: 'Date Picker', icon: CalendarCheck, path: '/components/date-picker'},
  {id: 'dialog', label: 'Dialog', icon: MessageSquare, path: '/components/dialog'},
  {id: 'dropdown-menu', label: 'Dropdown Menu', icon: Menu, path: '/components/dropdown-menu'},
  {id: 'editable-text', label: 'Editable Text', icon: Pencil, path: '/components/editable-text'},
  {id: 'empty', label: 'Empty', icon: Package, path: '/components/empty'},
  {id: 'form', label: 'Form', icon: FormInput, path: '/components/form'},
  {id: 'grid', label: 'Grid', icon: Grid3x3, path: '/components/grid'},
  {id: 'hover-card', label: 'Hover Card', icon: IdCard, path: '/components/hover-card'},
  {id: 'input', label: 'Input', icon: TextCursorInput, path: '/components/input'},
  {id: 'kbd', label: 'Kbd', icon: Keyboard, path: '/components/kbd'},
  {id: 'label', label: 'Label', icon: Type, path: '/components/label'},
  {id: 'legend', label: 'Legend', icon: Type, path: '/components/legend'},
  {id: 'month-picker', label: 'Month Picker', icon: CalendarDays, path: '/components/month-picker'},
  {id: 'month-range-picker', label: 'Month Range Picker', icon: CalendarRange, path: '/components/month-range-picker'},
  {id: 'number-field', label: 'Number Field', icon: Calculator, path: '/components/number-field'},
  {id: 'pagination', label: 'Pagination', icon: ListOrdered, path: '/components/pagination'},
  {id: 'pin-input', label: 'Pin Input', icon: KeyRound, path: '/components/pin-input'},
  {id: 'popover', label: 'Popover', icon: SquareMousePointer, path: '/components/popover'},
  {id: 'progress', label: 'Progress', icon: LoaderCircle, path: '/components/progress'},
  {id: 'radio-group', label: 'Radio Group', icon: CircleDot, path: '/components/radio-group'},
  {id: 'scroll-area', label: 'Scroll Area', icon: ArrowDownUp, path: '/components/scroll-area'},
  {id: 'select', label: 'Select', icon: ChevronsUpDown, path: '/components/select'},
  {id: 'separator', label: 'Separator', icon: Minus, path: '/components/separator'},
  {id: 'sheet', label: 'Sheet', icon: PanelRight, path: '/components/sheet'},
  {id: 'skeleton', label: 'Skeleton', icon: Bone, path: '/components/skeleton'},
  {id: 'slider', label: 'Slider', icon: SlidersHorizontal, path: '/components/slider'},
  {id: 'spinner', label: 'Spinner', icon: Loader2, path: '/components/spinner'},
  {id: 'splitter', label: 'Splitter', icon: Columns2, path: '/components/splitter'},
  {id: 'status-dot', label: 'Status Dot', icon: Circle, path: '/components/status-dot'},
  {id: 'switch', label: 'Switch', icon: ToggleRight, path: '/components/switch'},
  {id: 'table', label: 'Table', icon: Table, path: '/components/table'},
  {id: 'tabs', label: 'Tabs', icon: AppWindow, path: '/components/tabs'},
  {id: 'tag-input', label: 'Tag Input', icon: Tags, path: '/components/tag-input'},
  {id: 'textarea', label: 'Textarea', icon: Text, path: '/components/textarea'},
  {id: 'time-field', label: 'Time Field', icon: Clock, path: '/components/time-field'},
  {id: 'timeline', label: 'Timeline', icon: GitBranch, path: '/components/timeline'},
  {id: 'toast', label: 'Toast', icon: Megaphone, path: '/components/toast'},
  {id: 'toggle', label: 'Toggle', icon: ToggleLeft, path: '/components/toggle'},
  {id: 'toggle-group', label: 'Toggle Group', icon: Group, path: '/components/toggle-group'},
  {id: 'toolbar', label: 'Toolbar', icon: Wrench, path: '/components/toolbar'},
  {id: 'tooltip', label: 'Tooltip', icon: MousePointer, path: '/components/tooltip'},
  {id: 'tree', label: 'Tree', icon: ListTree, path: '/components/tree'},
  {id: 'truncate-middle', label: 'Truncate Middle', icon: Ellipsis, path: '/components/truncate-middle'},
  {id: 'year-picker', label: 'Year Picker', icon: CalendarDays, path: '/components/year-picker'},
];

const menuSections: NavigationSection[] = [
  {
    id: 'templates',
    label: 'Templates',
    items: [
      {id: 'file-manager', label: 'File Manager', icon: Package, disabled: true},
      {id: 'job-board', label: 'Job Board', icon: ListChecks, disabled: true},
      {id: 'stock-tracker', label: 'Stock Tracker', icon: ArrowDownUp, disabled: true},
    ],
  },
  {
    id: 'engines',
    label: 'Engines',
    items: [
      {id: 'drop-zone', label: 'Dropzone', icon: UploadCloud, path: '/components/drop-zone'},
      {id: 'video', label: 'Video', icon: Video, path: '/components/video'},
    ],
  },
  {
    id: 'components',
    label: 'Components',
    items: componentItems,
  },
];

function isSelected(item: NavigationItem) {
  return item.path === route.path;
}

function navigate(item: NavigationItem, event: MouseEvent) {
  if (!item.path) {
    return;
  }

  event.preventDefault();
  router.push(item.path);
}
</script>

<template>
  <Sidebar aria-label="primary sidebar" class="md:w-72 bg-transparent shrink-0">
    <SidebarSection
        v-for="section in menuSections"
        :key="section.id"
    >
      <SidebarSectionCaption>{{ section.label }}</SidebarSectionCaption>

      <SidebarMenu>
        <SidebarMenuItem
            v-for="item in section.items"
            :key="item.id"
            :href="item.path"
            :selected="isSelected(item)"
            :disabled="item.disabled"
            @click="navigate(item, $event)"
        >
          <template #icon>
            <component :is="item.icon" class="size-icon shrink-0" aria-hidden="true"/>
          </template>
          {{ item.label }}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarSection>

    <div class="h-44 pb-64"></div>
  </Sidebar>
</template>
