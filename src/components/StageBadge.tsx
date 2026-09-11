const TONES: Record<string, string> = {
  "Awaiting Design": "bg-stage text-stage-foreground",
  "Design Ready": "bg-accent text-accent-foreground",
  "In Production": "bg-[oklch(0.94_0.055_85)] text-[oklch(0.42_0.09_70)]",
  Shipped: "bg-[oklch(0.93_0.045_240)] text-[oklch(0.4_0.09_250)]",
  Delivered: "bg-primary/12 text-primary",
  Cancelled: "bg-destructive/10 text-destructive",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        TONES[stage] ?? "bg-stage text-stage-foreground"
      }`}
    >
      {stage}
    </span>
  );
}
