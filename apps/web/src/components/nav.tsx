"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ENV } from "@/lib/env";
import { explorerAddress } from "@/lib/format";
import { CordonMark } from "./cordon-mark";

const LINKS = [
  { href: "/stream", label: "Stream" },
  { href: "/quarantine", label: "Quarantine" },
  { href: "/audit", label: "Audit" },
  { href: "/policy", label: "Policy" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Re-render only when crossing the threshold.
      setScrolled((prev) => {
        const next = window.scrollY > 12;
        return prev === next ? prev : next;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const contract = explorerAddress(ENV.cordonAddress) ?? "#";

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300 ease-out"
      style={{ paddingTop: scrolled ? 14 : 0, paddingInline: scrolled ? 16 : 0 }}
    >
      <div
        className="mx-auto flex items-center justify-between bg-void transition-all duration-300 ease-out"
        style={{
          maxWidth: scrolled ? 860 : 1200,
          height: scrolled ? 52 : 64,
          paddingInline: 24,
          borderRadius: scrolled ? 24 : 0,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: scrolled ? "var(--hairline-strong)" : "transparent",
          borderBottomColor: scrolled ? "var(--hairline-strong)" : "var(--hairline)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="Cordon home">
          <CordonMark />
          <span className="text-[18px] font-semibold tracking-tight">Cordon</span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="t-body-sm text-smoke transition-colors hover:text-bone"
              style={{ letterSpacing: "0.02em" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <a
          href={contract}
          target="_blank"
          rel="noreferrer"
          className="eyebrow rounded-[24px] bg-plum px-4 py-2.5 text-bone transition-opacity hover:opacity-90"
          style={{ letterSpacing: "0.12em" }}
        >
          On Monad ↗
        </a>
      </div>
    </header>
  );
}
