import {
  CircleCheck,
  CircleX,
  DoorOpen,
  Flag,
  Hourglass,
  type LucideIcon,
  ReceiptText,
  TimerOff,
  UserX,
} from 'lucide-react';
import type { BookingStatus } from '@/lib/booking/status';
import { cn } from '@/lib/utils';

// Every state differs in icon, border style and fill, and prints its word.
// Colour reinforces the meaning but never carries it alone.
const STATUS_STYLES: Record<BookingStatus, { label: string; Icon: LucideIcon; className: string }> = {
  held: { label: 'Held', Icon: Hourglass, className: 'border-dashed border-clay-ink/70 bg-chalk text-clay-ink' },
  pending_verification: {
    label: 'Verifying',
    Icon: ReceiptText,
    className: 'border-dotted border-warning bg-chalk text-warning',
  },
  confirmed: { label: 'Confirmed', Icon: CircleCheck, className: 'border-clay-ink bg-chalk text-clay-ink' },
  checked_in: { label: 'Checked in', Icon: DoorOpen, className: 'border-ink bg-ink text-chalk' },
  completed: { label: 'Completed', Icon: Flag, className: 'border-greige bg-transparent text-ink-soft' },
  cancelled: { label: 'Cancelled', Icon: CircleX, className: 'border-danger/40 bg-transparent text-danger line-through' },
  expired: { label: 'Expired', Icon: TimerOff, className: 'border-transparent bg-greige/60 text-ink-soft' },
  no_show: {
    label: 'No-show',
    Icon: UserX,
    className:
      'border-danger text-danger bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgb(163_50_31/0.12)_4px_8px)]',
  },
};

export function StatusChip({ status, className }: { status: BookingStatus; className?: string }) {
  const { label, Icon, className: variantClass } = STATUS_STYLES[status];
  return (
    <span
      data-variant={status}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        variantClass,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
