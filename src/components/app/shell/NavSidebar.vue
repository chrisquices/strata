<script setup lang="ts">
import {useRoute, useRouter} from 'vue-router';
import Sidebar from '@ui/Sidebar/Sidebar.vue';
import SidebarSection from '@ui/Sidebar/SidebarSection.vue';
import SidebarMenuItem from '@ui/Sidebar/SidebarMenuItem.vue';
import SidebarMenu from '@ui/Sidebar/SidebarMenu.vue';
import { Rows3, MousePointerClick, Package, PanelLeft, Hexagon, CaseUpper, AlertCircle, Scan, Tag, Slash, CircleUser, BellRing, LayoutTemplate, CheckSquare, Hash, ChevronsDownUp, MousePointer2, MessageSquare, Menu, Code2, UploadCloud, Keyboard, Type, MenuSquare, Navigation, LayoutGrid, ListOrdered, KeyRound, Minus, PanelRight, SlidersHorizontal, Activity, Loader2, TrendingUp, Circle, ChevronsRight, ArrowDownUp, GitBranch, Ellipsis, ListTree, TextCursorInput, Text, MousePointer, IdCard, PanelTop, ChevronsUpDown, ToggleRight, TextSearch, SquareMousePointer, CircleDot, ToggleLeft, Group, AppWindow, Tags, Wrench, Clock, CalendarDays, PanelRightOpen, Pencil, FormInput, HardDrive, LoaderCircle, Bone, Megaphone, List, ListChecks, Calculator, Columns2, CalendarRange, CalendarCheck, Palette, Table, Star } from '@lucide/vue';
import SidebarSectionCaption from "@ui/Sidebar/SidebarSectionCaption.vue";

const route = useRoute();
const router = useRouter();

const menuItems = [
  { id: 'accordion', label: 'Accordion', icon: Rows3 },
  { id: 'alert-dialog', label: 'Alert Dialog', icon: AlertCircle },
  { id: 'aspect-ratio', label: 'Aspect Ratio', icon: Scan },
  { id: 'avatar', label: 'Avatar', icon: CircleUser },
  { id: 'banner', label: 'Banner', icon: BellRing },
  { id: 'card', label: 'Card', icon: LayoutTemplate },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'range-calendar', label: 'Range Calendar', icon: CalendarRange },
  { id: 'date-picker', label: 'Date Picker', icon: CalendarCheck },
  { id: 'date-range-picker', label: 'Date Range Picker', icon: CalendarRange },
  { id: 'time-field', label: 'Time Field', icon: Clock },
  { id: 'month-picker', label: 'Month Picker', icon: CalendarDays },
  { id: 'year-picker', label: 'Year Picker', icon: CalendarDays },
  { id: 'color-picker', label: 'Color Picker', icon: Palette },
  { id: 'table', label: 'Table', icon: Table },
  { id: 'rating', label: 'Rating', icon: Star },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { id: 'checkbox-group', label: 'Checkbox Group', icon: ListChecks },
  { id: 'chip', label: 'Chip', icon: Hash },
  { id: 'code-block', label: 'Code Block', icon: Code2 },
  { id: 'collapsible', label: 'Collapsible', icon: ChevronsDownUp },
  { id: 'context-menu', label: 'Context Menu', icon: MousePointer2 },
  { id: 'dialog', label: 'Dialog', icon: MessageSquare },
  { id: 'dropdown-menu', label: 'Dropdown Menu', icon: Menu },
  { id: 'input', label: 'Input', icon: TextCursorInput },
  { id: 'textarea', label: 'Textarea', icon: Text },
  { id: 'number-field', label: 'Number Field', icon: Calculator },
  { id: 'hover-card', label: 'Hover Card', icon: IdCard },
  { id: 'tooltip', label: 'Tooltip', icon: MousePointer },
  { id: 'topbar', label: 'Topbar', icon: PanelTop },
  { id: 'select', label: 'Select', icon: ChevronsUpDown },
  { id: 'combobox', label: 'Combobox', icon: TextSearch },
  { id: 'switch', label: 'Switch', icon: ToggleRight },
  { id: 'popover', label: 'Popover', icon: SquareMousePointer },
  { id: 'radio-group', label: 'Radio Group', icon: CircleDot },
  { id: 'listbox', label: 'Listbox', icon: List },
  { id: 'toggle', label: 'Toggle', icon: ToggleLeft },
  { id: 'toggle-group', label: 'Toggle Group', icon: Group },
  { id: 'tabs', label: 'Tabs', icon: AppWindow },
  { id: 'tag-input', label: 'Tag Input', icon: Tags },
  { id: 'toolbar', label: 'Toolbar', icon: Wrench },
  { id: 'relative-time', label: 'Relative Time', icon: Clock },
  { id: 'detail-pane', label: 'Detail Pane', icon: PanelRightOpen },
  { id: 'editable-text', label: 'Editable Text', icon: Pencil },
  { id: 'field', label: 'Field', icon: FormInput },
  { id: 'file-size', label: 'File Size', icon: HardDrive },
  { id: 'progress', label: 'Progress', icon: LoaderCircle },
  { id: 'skeleton', label: 'Skeleton', icon: Bone },
  { id: 'toast', label: 'Toast', icon: Megaphone },
  { id: 'drop-zone', label: 'Drop Zone', icon: UploadCloud },
  { id: 'kbd', label: 'Kbd', icon: Keyboard },
  { id: 'label', label: 'Label', icon: Type },
  { id: 'menubar', label: 'Menubar', icon: MenuSquare },
  { id: 'navigation-menu', label: 'Navigation Menu', icon: Navigation },
  { id: 'launcher', label: 'Launcher', icon: LayoutGrid },
  { id: 'pagination', label: 'Pagination', icon: ListOrdered },
  { id: 'pin-input', label: 'Pin Input', icon: KeyRound },
  { id: 'separator', label: 'Separator', icon: Minus },
  { id: 'sheet', label: 'Sheet', icon: PanelRight },
  { id: 'slider', label: 'Slider', icon: SlidersHorizontal },
  { id: 'sparkline', label: 'Sparkline', icon: Activity },
  { id: 'spinner', label: 'Spinner', icon: Loader2 },
  { id: 'splitter', label: 'Splitter', icon: Columns2 },
  { id: 'stat', label: 'Stat', icon: TrendingUp },
  { id: 'status-dot', label: 'Status Dot', icon: Circle },
  { id: 'stepper', label: 'Stepper', icon: ChevronsRight },
  { id: 'scroll-area', label: 'Scroll Area', icon: ArrowDownUp },
  { id: 'timeline', label: 'Timeline', icon: GitBranch },
  { id: 'tree', label: 'Tree', icon: ListTree },
  { id: 'truncate-middle', label: 'Truncate Middle', icon: Ellipsis },
  { id: 'badge', label: 'Badge', icon: Tag },
  { id: 'breadcrumb', label: 'Breadcrumb', icon: Slash },
  { id: 'button', label: 'Button', icon: MousePointerClick },
  { id: 'brand-mark', label: 'Brand Mark', icon: Hexagon },
  { id: 'caption', label: 'Caption', icon: CaseUpper },
  { id: 'empty', label: 'Empty', icon: Package },
  { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
].sort((a, b) => a.label.localeCompare(b.label));

function navigate(id: string, e: MouseEvent) {
  e.preventDefault();
  router.push(`/components/${id}`);
}
</script>

<template>
  <Sidebar
      aria-label="components sidebar"
      side="left"
      class="strata-chrome z-sidebar md:w-72 transition-[width] duration-base"
  >
    <SidebarSection>
      <SidebarSectionCaption>
        Components
      </SidebarSectionCaption>
      <SidebarMenu>
        <SidebarMenuItem
            v-for="item in menuItems"
            :key="item.id"
            :href="`/components/${item.id}`"
            :selected="route.path === `/components/${item.id}`"
            @click="navigate(item.id, $event)"
        >
          <template #icon>
            <component :is="item.icon" class="size-icon-medium shrink-0" aria-hidden="true"/>
          </template>
          {{ item.label }}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarSection>
  </Sidebar>
</template>
