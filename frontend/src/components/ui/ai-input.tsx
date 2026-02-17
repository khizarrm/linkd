"use client";

import { CornerRightUp, Mic, Square } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";

interface AIInputProps {
  id?: string
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  onSubmit?: (value: string) => void
  onStop?: () => void
  className?: string
  disabled?: boolean
}

export function AIInput({
  id = "ai-input",
  placeholder = "Type your message...",
  minHeight = 56,
  maxHeight = 160,
  onSubmit,
  onStop,
  className,
  disabled = false
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [inputValue, setInputValue] = useState("");

  const handleReset = () => {
    if (!inputValue.trim() || disabled) return;
    onSubmit?.(inputValue);
    setInputValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full flex justify-center", className)}>
      <div className="relative max-w-2xl w-full">
        <Textarea
          id={id}
          placeholder={placeholder}
          className={cn(
            "w-full bg-muted/50 rounded-full pl-5 pr-14 border border-border/50 shadow-sm",
            "placeholder:text-muted-foreground/70",
            "text-foreground text-sm text-wrap",
            "overflow-y-auto resize-none",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:border-ring/50 focus-visible:bg-background",
            "transition-all duration-200 ease-out",
            "leading-relaxed py-3.5",
            "min-h-[56px] max-h-[160px] flex items-center",
            "[&::-webkit-resizer]:hidden",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              handleReset();
            }
          }}
          disabled={disabled}
        />

        <button
          onClick={disabled ? onStop : handleReset}
          type="button"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 right-3",
            "rounded-full p-2 shadow-sm",
            "transition-all duration-200",
            disabled
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 opacity-100 scale-100"
              : inputValue
              ? "bg-primary text-primary-foreground hover:bg-primary/90 opacity-100 scale-100"
              : "bg-primary text-primary-foreground opacity-0 scale-95 pointer-events-none"
          )}
        >
          {disabled ? (
            <Square className="w-3 h-3 fill-current" />
          ) : (
            <CornerRightUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}