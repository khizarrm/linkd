"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  status: "running" | "done";
}

export interface StepItemProps {
  step: Step;
}

export function StepItem({ step }: StepItemProps) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
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
  );
}
