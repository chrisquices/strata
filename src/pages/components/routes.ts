import Accordion from './Accordion.vue';
import AlertDialog from './AlertDialog.vue';
import AspectRatio from './AspectRatio.vue';
import Avatar from './Avatar.vue';
import Banner from './Banner.vue';
import Card from './Card.vue';
import Calendar from './Calendar.vue';
import RangeCalendar from './RangeCalendar.vue';
import DatePicker from './DatePicker.vue';
import DateRangePicker from './DateRangePicker.vue';
import TimeField from './TimeField.vue';
import MonthPicker from './MonthPicker.vue';
import YearPicker from './YearPicker.vue';
import ColorPicker from './ColorPicker.vue';
import Table from './Table.vue';
import Rating from './Rating.vue';
import Checkbox from './Checkbox.vue';
import CheckboxGroup from './CheckboxGroup.vue';
import Chip from './Chip.vue';
import CodeBlock from './CodeBlock.vue';
import Collapsible from './Collapsible.vue';
import ContextMenu from './ContextMenu.vue';
import Dialog from './Dialog.vue';
import DropdownMenu from './DropdownMenu.vue';
import Input from './Input.vue';
import Textarea from './Textarea.vue';
import NumberField from './NumberField.vue';
import HoverCard from './HoverCard.vue';
import Tooltip from './Tooltip.vue';
import Topbar from './Topbar.vue';
import Select from './Select.vue';
import Combobox from './Combobox.vue';
import Switch from './Switch.vue';
import Popover from './Popover.vue';
import RadioGroup from './RadioGroup.vue';
import Listbox from './Listbox.vue';
import Toggle from './Toggle.vue';
import ToggleGroup from './ToggleGroup.vue';
import Tabs from './Tabs.vue';
import TagInput from './TagInput.vue';
import Toolbar from './Toolbar.vue';
import RelativeTime from './RelativeTime.vue';
import DetailPane from './DetailPane.vue';
import EditableText from './EditableText.vue';
import Field from './Field.vue';
import FileSize from './FileSize.vue';
import Progress from './Progress.vue';
import Skeleton from './Skeleton.vue';
import Toast from './Toast.vue';
import DropZone from './DropZone.vue';
import Kbd from './Kbd.vue';
import Label from './Label.vue';
import Menubar from './Menubar.vue';
import NavigationMenu from './NavigationMenu.vue';
import Launcher from './Launcher.vue';
import Pagination from './Pagination.vue';
import PinInput from './PinInput.vue';
import Separator from './Separator.vue';
import Sheet from './Sheet.vue';
import Slider from './Slider.vue';
import Sparkline from './Sparkline.vue';
import Spinner from './Spinner.vue';
import Splitter from './Splitter.vue';
import Stat from './Stat.vue';
import StatusDot from './StatusDot.vue';
import Stepper from './Stepper.vue';
import ScrollArea from './ScrollArea.vue';
import Timeline from './Timeline.vue';
import Tree from './Tree.vue';
import TruncateMiddle from './TruncateMiddle.vue';
import Badge from './Badge.vue';
import Breadcrumb from './Breadcrumb.vue';
import Button from './Button.vue';
import BrandMark from './BrandMark.vue';
import Caption from './Caption.vue';
import Empty from './Empty.vue';
import Sidebar from './Sidebar.vue';

// Independent route per component page — no barrel/parent dispatch.
export const componentRoutes = [
  { path: '/components/accordion', component: Accordion },
  { path: '/components/alert-dialog', component: AlertDialog },
  { path: '/components/aspect-ratio', component: AspectRatio },
  { path: '/components/avatar', component: Avatar },
  { path: '/components/banner', component: Banner },
  { path: '/components/card', component: Card },
  { path: '/components/calendar', component: Calendar },
  { path: '/components/range-calendar', component: RangeCalendar },
  { path: '/components/date-picker', component: DatePicker },
  { path: '/components/date-range-picker', component: DateRangePicker },
  { path: '/components/time-field', component: TimeField },
  { path: '/components/month-picker', component: MonthPicker },
  { path: '/components/year-picker', component: YearPicker },
  { path: '/components/color-picker', component: ColorPicker },
  { path: '/components/table', component: Table },
  { path: '/components/rating', component: Rating },
  { path: '/components/checkbox', component: Checkbox },
  { path: '/components/checkbox-group', component: CheckboxGroup },
  { path: '/components/chip', component: Chip },
  { path: '/components/code-block', component: CodeBlock },
  { path: '/components/collapsible', component: Collapsible },
  { path: '/components/context-menu', component: ContextMenu },
  { path: '/components/dialog', component: Dialog },
  { path: '/components/dropdown-menu', component: DropdownMenu },
  { path: '/components/input', component: Input },
  { path: '/components/textarea', component: Textarea },
  { path: '/components/number-field', component: NumberField },
  { path: '/components/hover-card', component: HoverCard },
  { path: '/components/tooltip', component: Tooltip },
  { path: '/components/topbar', component: Topbar },
  { path: '/components/select', component: Select },
  { path: '/components/combobox', component: Combobox },
  { path: '/components/switch', component: Switch },
  { path: '/components/popover', component: Popover },
  { path: '/components/radio-group', component: RadioGroup },
  { path: '/components/listbox', component: Listbox },
  { path: '/components/toggle', component: Toggle },
  { path: '/components/toggle-group', component: ToggleGroup },
  { path: '/components/tabs', component: Tabs },
  { path: '/components/tag-input', component: TagInput },
  { path: '/components/toolbar', component: Toolbar },
  { path: '/components/relative-time', component: RelativeTime },
  { path: '/components/detail-pane', component: DetailPane },
  { path: '/components/editable-text', component: EditableText },
  { path: '/components/field', component: Field },
  { path: '/components/file-size', component: FileSize },
  { path: '/components/progress', component: Progress },
  { path: '/components/skeleton', component: Skeleton },
  { path: '/components/toast', component: Toast },
  { path: '/components/drop-zone', component: DropZone },
  { path: '/components/kbd', component: Kbd },
  { path: '/components/label', component: Label },
  { path: '/components/menubar', component: Menubar },
  { path: '/components/navigation-menu', component: NavigationMenu },
  { path: '/components/launcher', component: Launcher },
  { path: '/components/pagination', component: Pagination },
  { path: '/components/pin-input', component: PinInput },
  { path: '/components/separator', component: Separator },
  { path: '/components/sheet', component: Sheet },
  { path: '/components/slider', component: Slider },
  { path: '/components/sparkline', component: Sparkline },
  { path: '/components/spinner', component: Spinner },
  { path: '/components/splitter', component: Splitter },
  { path: '/components/stat', component: Stat },
  { path: '/components/status-dot', component: StatusDot },
  { path: '/components/stepper', component: Stepper },
  { path: '/components/scroll-area', component: ScrollArea },
  { path: '/components/timeline', component: Timeline },
  { path: '/components/tree', component: Tree },
  { path: '/components/truncate-middle', component: TruncateMiddle },
  { path: '/components/badge', component: Badge },
  { path: '/components/breadcrumb', component: Breadcrumb },
  { path: '/components/button', component: Button },
  { path: '/components/brand-mark', component: BrandMark },
  { path: '/components/caption', component: Caption },
  { path: '/components/empty', component: Empty },
  { path: '/components/sidebar', component: Sidebar },
];
