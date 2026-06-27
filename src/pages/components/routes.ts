import Accordion from './Accordion.vue';
import AlertDialog from './AlertDialog.vue';
import AspectRatio from './AspectRatio.vue';
import Avatar from './Avatar.vue';
import Banner from './Banner.vue';
import Card from './Card.vue';
import DatePicker from './DatePicker.vue';
import TimeField from './TimeField.vue';
import MonthPicker from './MonthPicker.vue';
import MonthRangePicker from './MonthRangePicker.vue';
import YearPicker from './YearPicker.vue';
import ColorPicker from './ColorPicker.vue';
import Table from './Table.vue';
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
import Select from './Select.vue';
import Combobox from './Combobox.vue';
import Switch from './Switch.vue';
import Popover from './Popover.vue';
import RadioGroup from './RadioGroup.vue';
import Toggle from './Toggle.vue';
import ToggleGroup from './ToggleGroup.vue';
import Tabs from './Tabs.vue';
import TagInput from './TagInput.vue';
import Toolbar from './Toolbar.vue';
import EditableText from './EditableText.vue';
import Form from './Form.vue';
import Grid from './Grid.vue';
import Progress from './Progress.vue';
import Skeleton from './Skeleton.vue';
import Toast from './Toast.vue';
import DropZone from './DropZone.vue';
import Kbd from './Kbd.vue';
import Label from './Label.vue';
import Legend from './Legend.vue';
import Menubar from './Menubar.vue';
import Pagination from './Pagination.vue';
import PinInput from './PinInput.vue';
import Separator from './Separator.vue';
import Sheet from './Sheet.vue';
import Slider from './Slider.vue';
import Spinner from './Spinner.vue';
import Splitter from './Splitter.vue';
import StatusDot from './StatusDot.vue';
import ScrollArea from './ScrollArea.vue';
import Timeline from './Timeline.vue';
import Tree from './Tree.vue';
import TruncateMiddle from './TruncateMiddle.vue';
import Badge from './Badge.vue';
import Breadcrumb from './Breadcrumb.vue';
import Button from './Button.vue';
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
  { path: '/components/date-picker', component: DatePicker },
  { path: '/components/time-field', component: TimeField },
  { path: '/components/month-picker', component: MonthPicker },
  { path: '/components/month-range-picker', component: MonthRangePicker },
  { path: '/components/year-picker', component: YearPicker },
  { path: '/components/color-picker', component: ColorPicker },
  { path: '/components/table', component: Table },
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
  { path: '/components/select', component: Select },
  { path: '/components/combobox', component: Combobox },
  { path: '/components/switch', component: Switch },
  { path: '/components/popover', component: Popover },
  { path: '/components/radio-group', component: RadioGroup },
  { path: '/components/toggle', component: Toggle },
  { path: '/components/toggle-group', component: ToggleGroup },
  { path: '/components/tabs', component: Tabs },
  { path: '/components/tag-input', component: TagInput },
  { path: '/components/toolbar', component: Toolbar },
  { path: '/components/editable-text', component: EditableText },
  { path: '/components/form', component: Form },
  { path: '/components/field', redirect: '/components/form' },
  { path: '/components/grid', component: Grid },
  { path: '/components/progress', component: Progress },
  { path: '/components/skeleton', component: Skeleton },
  { path: '/components/toast', component: Toast },
  { path: '/components/drop-zone', component: DropZone },
  { path: '/components/kbd', component: Kbd },
  { path: '/components/label', component: Label },
  { path: '/components/legend', component: Legend },
  { path: '/components/menubar', component: Menubar },
  { path: '/components/pagination', component: Pagination },
  { path: '/components/pin-input', component: PinInput },
  { path: '/components/separator', component: Separator },
  { path: '/components/sheet', component: Sheet },
  { path: '/components/slider', component: Slider },
  { path: '/components/spinner', component: Spinner },
  { path: '/components/splitter', component: Splitter },
  { path: '/components/status-dot', component: StatusDot },
  { path: '/components/scroll-area', component: ScrollArea },
  { path: '/components/timeline', component: Timeline },
  { path: '/components/tree', component: Tree },
  { path: '/components/truncate-middle', component: TruncateMiddle },
  { path: '/components/badge', component: Badge },
  { path: '/components/breadcrumb', component: Breadcrumb },
  { path: '/components/button', component: Button },
  { path: '/components/caption', component: Caption },
  { path: '/components/empty', component: Empty },
  { path: '/components/sidebar', component: Sidebar },
];
