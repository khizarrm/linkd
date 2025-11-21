import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-all placeholder:text-slate-400 focus:border-gray-700 focus:outline-none focus:ring-0 selection:bg-gray-700 selection:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-gray-700",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };



