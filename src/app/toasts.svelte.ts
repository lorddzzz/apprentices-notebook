export type ToastTone = 'info' | 'warn';
export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

export const toasts = $state({ items: [] as Toast[] });

let nextId = 1;

export function toast(text: string, tone: ToastTone = 'info'): void {
  const id = nextId++;
  toasts.items.push({ id, text, tone });
  setTimeout(() => {
    toasts.items = toasts.items.filter((t) => t.id !== id);
  }, 2500);
}
