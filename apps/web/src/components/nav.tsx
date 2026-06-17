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
  const [open, setOpen] = useState(false);

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
        <Link href="/" className="flex items-center gap-2.5" aria-label="Cordon home" onClick={() => setOpen(false)}>
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

        <div className="flex items-center gap-2.5">
          <a
            href={contract}
            target="_blank"
            rel="noreferrer"
            className="eyebrow hidden rounded-[24px] bg-plum px-4 py-2.5 text-bone transition-opacity hover:opacity-90 md:inline-flex"
            style={{ letterSpacing: "0.12em" }}
          >
            On Monad ↗
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-[14px] border text-bone md:hidden"
            style={{ borderColor: "var(--hairline-strong)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="4" y1="4" x2="14" y2="14" />
                  <line x1="14" y1="4" x2="4" y2="14" />
                </>
              ) : (
                <>
                  <line x1="2.5" y1="5" x2="15.5" y2="5" />
                  <line x1="2.5" y1="9" x2="15.5" y2="9" />
                  <line x1="2.5" y1="13" x2="15.5" y2="13" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="mx-auto mt-2 flex flex-col overflow-hidden bg-void md:hidden"
          style={{
            maxWidth: scrolled ? 860 : 1200,
            borderRadius: 24,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--hairline-strong)",
          }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4 t-body text-ash transition-colors hover:text-bone"
              style={{ borderColor: "var(--hairline)" }}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={contract}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="px-6 py-4 t-body text-plum"
          >
            On Monad ↗
          </a>
        </div>
      ) : null}
    </header>
  );
}
