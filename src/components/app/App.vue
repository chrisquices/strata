<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import {
  Activity,
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
  ChevronsRight,
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
  Group,
  HardDrive,
  Hash,
  IdCard,
  KeyRound,
  Keyboard,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  Loader2,
  LoaderCircle,
  Megaphone,
  Menu,
  MenuSquare,
  MessageSquare,
  Minus,
  MousePointer,
  MousePointer2,
  MousePointerClick,
  Navigation,
  Package,
  Palette,
  PanelLeft,
  PanelRight,
  PanelRightOpen,
  PanelTop,
  Pencil,
  Rows3,
  Scan,
  Slash,
  SlidersHorizontal,
  SquareMousePointer,
  Star,
  Table,
  Tag,
  Tags,
  Text,
  TextCursorInput,
  TextSearch,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Type,
  UploadCloud,
  Wrench,
} from '@lucide/vue';
import Caption from '@ui/Caption/Caption.vue';
import Button from '@ui/Button/Button.vue';
import Sidebar from '@ui/Sidebar/Sidebar.vue';
import SidebarActions from '@ui/Sidebar/SidebarActions.vue';
import SidebarMenu from '@ui/Sidebar/SidebarMenu.vue';
import SidebarMenuItem from '@ui/Sidebar/SidebarMenuItem.vue';
import SidebarSection from '@ui/Sidebar/SidebarSection.vue';
import SidebarSectionCaption from '@ui/Sidebar/SidebarSectionCaption.vue';

const route = useRoute();
const router = useRouter();

const componentItems = [
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
  { id: 'brand-mark', label: 'Brand Mark', icon: Layers },
  { id: 'caption', label: 'Caption', icon: CaseUpper },
  { id: 'empty', label: 'Empty', icon: Package },
  { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
].sort((a, b) => a.label.localeCompare(b.label));

const utilityItems = [
  { id: 'virtualization-engine', label: 'Virtualization Engine', icon: ListTree },
];

const activeSection = computed(() => (route.path.startsWith('/utilities') ? 'utilities' : 'components'));
const menuItems = computed(() => (activeSection.value === 'utilities' ? utilityItems : componentItems));
const menuCaption = computed(() => (activeSection.value === 'utilities' ? 'Utilities' : 'Components'));

function navigate(id: string, event: MouseEvent) {
  event.preventDefault();
  router.push(`/${activeSection.value}/${id}`);
}
</script>

<template>
  <div class="strata-shell flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <header class="strata-chrome shrink-0 border-b border-border bg-topbar/90 backdrop-blur">
      <div class="flex h-chrome-bar items-center justify-center px-6">
        <RouterLink
            to="/"
            class="flex items-center gap-3 rounded-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <Caption tone="foreground">Strata</Caption>
        </RouterLink>
      </div>
    </header>

    <div class="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1">
      <Sidebar
          aria-label="primary sidebar"
          side="left"
          class="strata-chrome z-sidebar md:w-72 transition-[width] duration-200"
      >
        <SidebarActions>
          <div class="grid w-full grid-cols-2 gap-1">
            <Button
                size="sm"
                :variant="route.path.startsWith('/components') ? 'secondary' : 'muted'"
                @click="router.push('/components')"
            >
              <Layers class="size-icon-small" aria-hidden="true" />
              Components
            </Button>
            <Button
                size="sm"
                :variant="route.path.startsWith('/utilities') ? 'secondary' : 'muted'"
                @click="router.push('/utilities')"
            >
              <Wrench class="size-icon-small" aria-hidden="true" />
              Utilities
            </Button>
          </div>
        </SidebarActions>

        <SidebarSection>
          <SidebarSectionCaption>{{ menuCaption }}</SidebarSectionCaption>

          <SidebarMenu>
            <SidebarMenuItem
                v-for="item in menuItems"
                :key="item.id"
                :href="`/${activeSection}/${item.id}`"
                :selected="route.path === `/${activeSection}/${item.id}`"
                @click="navigate(item.id, $event)"
            >
              <template #icon>
                <component :is="item.icon" class="size-icon-medium shrink-0" aria-hidden="true" />
              </template>
              {{ item.label }}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarSection>
      </Sidebar>

      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div class="min-w-0 flex-1 overflow-y-auto">
          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>
