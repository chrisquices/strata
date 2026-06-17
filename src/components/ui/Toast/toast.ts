// Imperative toast API + the queue the <Toaster /> renders.
//   import { toast } from '@ui';
//   toast('Saved');                     // default
//   toast.success('Profile updated');
//   toast.error({ title: 'Upload failed', description: 'Try again.' });
//   const id = toast({ title: 'Working…', duration: 0 }); toast.dismiss(id);
import { reactive } from 'vue';

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive';

export interface ToastAction {
  /** Button text, also used as the screen-reader label (reka requires it) — keep it descriptive and non-empty. */
  label: string;
  /** Runs on click. Note: clicking an action also dismisses the toast (reka's Action semantics), like an "Undo". */
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Omit to use the Toaster default; 0 keeps it until dismissed. */
  duration?: number;
  action?: ToastAction;
}

export interface ToastRecord extends ToastOptions {
  id: number;
  variant: ToastVariant;
  open: boolean;
}

// A reactive array (not a ref) so an imported reference iterates directly in templates.
export const toasts = reactive<ToastRecord[]>([]);

let uid = 0;

function show(options: ToastOptions): number {
  const id = ++uid;
  toasts.push({ id, variant: 'default', open: true, ...options });
  return id;
}

/** Begin closing a toast — plays the exit animation; the Toaster removes it once finished. */
export function dismiss(id: number): void {
  const record = toasts.find(t => t.id === id);
  if (record) record.open = false;
}

/** Remove a toast from the queue outright (called by the Toaster after the close animation). */
export function remove(id: number): void {
  const index = toasts.findIndex(t => t.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

type VariantArg = string | Omit<ToastOptions, 'variant'>;
const variantHelper = (variant: ToastVariant) => (arg: VariantArg): number =>
  show(typeof arg === 'string' ? { title: arg, variant } : { ...arg, variant });

/** Callable toast API with per-variant helpers and `dismiss`. */
export const toast = Object.assign(
  (arg: string | ToastOptions): number => show(typeof arg === 'string' ? { title: arg } : arg),
  {
    success: variantHelper('success'),
    warning: variantHelper('warning'),
    error: variantHelper('destructive'),
    info: variantHelper('default'),
    dismiss,
  },
);
