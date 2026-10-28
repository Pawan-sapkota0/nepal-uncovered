import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  icon?: string | null;
  className?: string;
}

function isSupportedEmoji(icon: string): boolean {
  return (
    icon.length <= 24 &&
    /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(icon) &&
    !/[\p{L}\p{N}\s]/u.test(icon)
  );
}

export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const value = icon?.trim();
  const validEmoji = !!value && isSupportedEmoji(value);

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)} aria-hidden="true">
      {validEmoji ? value : <Tag className="h-[0.7em] w-[0.7em]" />}
    </span>
  );
}
