"use client";

import * as React from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  status: "running" | "done";
}

export interface ToolCallAccordionProps {
  steps: Step[];
  isLoading: boolean;
}

export function ToolCallAccordion({ steps, isLoading }: ToolCallAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full rounded-md border bg-card text-card-foreground shadow-sm"
    >
      <Collapsible.Trigger asChild>
        <button className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-foreground">
              {isLoading ? "Working..." : "Completed"}
            </span>
            <span className="text-muted-foreground">
              ({steps.length} step{steps.length !== 1 ? "s" : ""})
            </span>
          </div>
          {isLoading && !isOpen && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content className="overflow-hidden">
        <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-2 py-1 text-sm"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                {step.status === "running" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                )}
              </div>
              <span
                className={cn(
                  "text-muted-foreground",
                  step.status === "running" && "text-foreground font-medium"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
