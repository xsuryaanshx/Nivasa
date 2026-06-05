import { GlassModal } from "./GlassModal";

const groups: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "General",
    items: [
      { keys: ["?"], label: "Show this shortcuts panel" },
      { keys: ["Esc"], label: "Close any modal" },
    ],
  },
  {
    title: "Navigate",
    items: [
      { keys: ["G", "D"], label: "Go to Dashboard" },
      { keys: ["G", "B"], label: "Go to Buildings" },
      { keys: ["G", "R"], label: "Go to Rooms" },
      { keys: ["G", "P"], label: "Go to Payments" },
    ],
  },
  {
    title: "Actions",
    items: [
      { keys: ["N", "P"], label: "New payment" },
      { keys: ["N", "T"], label: "New tenant" },
      { keys: ["T"], label: "Toggle theme" },
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <GlassModal open={open} onClose={onClose} title="Keyboard shortcuts" description="Move faster — keep your hands on the keys.">
      <div className="grid gap-5 sm:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</div>
            <ul className="space-y-2">
              {g.items.map((it) => (
                <li key={it.label} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground/85">{it.label}</span>
                  <span className="inline-flex items-center gap-1">
                    {it.keys.map((k, i) => (
                      <kbd key={i} className="rounded border border-border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </GlassModal>
  );
}