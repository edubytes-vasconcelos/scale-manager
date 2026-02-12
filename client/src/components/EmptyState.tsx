import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
