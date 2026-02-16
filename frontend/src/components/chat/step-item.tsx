"use client";

import * as React from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  status: "running" | "done" | "failed";
}

export interface StepItemProps {
  step: Step;
}

function StepIcon({ status }: { status: Step["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case "failed":
      return <X className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <Check className="h-3.5 w-3.5 text-green-500" />;
  }
}

export function StepItem({ step }: StepItemProps) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="flex h-5 w-5 items-center justify-center">
        <StepIcon status={step.status} />
      </div>
      <span
        className={cn(
          "text-muted-foreground",
          step.status === "running" && "text-foreground font-medium"
        )}
      >
        {step.label}{step.status === "failed" ? " — not found" : ""}
      </span>
    </div>
  );
}
