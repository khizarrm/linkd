"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type LandingHeaderProps = {
  onOpenSignIn: (source: string) => void;
};

const NAV_ITEMS = [
  { href: "#proof", label: "Proof" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/guide", label: "Guide" },
];

export function LandingHeader({ onOpenSignIn }: LandingHeaderProps) {
  return (
    <header className="sticky top-4 z-40 px-4 md:px-6">
      <div className="glass-surface mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-full px-4 md:px-6">
        <a
          href="#top"
          className="text-sm uppercase tracking-[0.16em] text-[#f4efdf] transition-opacity hover:opacity-85"
        >
          Linkd
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-[#b8bdb6] transition-all duration-200 hover:bg-white/8 hover:text-[#f4efdf]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button
            onClick={() => onOpenSignIn("header_desktop")}
            className="h-9 rounded-full bg-[#efe6d3] px-5 text-[#121311] shadow-[0_8px_22px_rgba(0,0,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e4d8bf]"
          >
            Start for internships
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              className="rounded-md border border-[#2b2d2b] p-2 text-[#f4efdf]"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-l border-[#2b2d2b] bg-[#111211] text-[#f4efdf]"
            >
              <SheetHeader>
                <SheetTitle className="text-left uppercase tracking-[0.16em] text-[#f4efdf]">
                  Linkd
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-2 py-1 text-sm text-[#b8bdb6] transition-colors hover:bg-white/8 hover:text-[#f4efdf]"
                  >
                    {item.label}
                  </a>
                ))}
                <Button
                  onClick={() => onOpenSignIn("header_mobile")}
                  className="mt-3 rounded-full bg-[#efe6d3] text-[#121311] hover:bg-[#e4d8bf]"
                >
                  Start for internships
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
