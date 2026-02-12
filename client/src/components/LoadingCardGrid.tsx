import { cn } from "@/lib/utils";

interface LoadingCardGridProps {
  count?: number;
  height?: string;
  columns?: 1 | 2 | 3;
  itemClassName?: string;
}

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

export function LoadingCardGrid({
  count = 4,
  height = "h-24",
  columns = 2,
  itemClassName = "rounded-xl bg-muted",
}: LoadingCardGridProps) {
  return (
    <div className={cn("grid gap-4", columnClasses[columns])}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn("animate-pulse", itemClassName, height)}
        />
      ))}
    </div>
  );
}
