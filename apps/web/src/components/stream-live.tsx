"use client";

import { useEffect, useState } from "react";
import { DepositRow } from "@/components/deposit-row";
import { createSupabase, mapDeposit } from "@/lib/supabase";
import type { Deposit } from "@/lib/types";

const POLL_MS = 4000;
const LIMIT = 60;

export function StreamLive({ initial }: { initial: Deposit[] }) {
  const [deposits, setDeposits] = useState<Deposit[]>(initial);

  useEffect(() => {
    const db = createSupabase();
    let active = true;

    async function poll(): Promise<void> {
      const { data } = await db
        .from("deposits")
        .select("*")
        .order("screened_at", { ascending: false })
        .limit(LIMIT);
      if (active && data) setDeposits(data.map(mapDeposit));
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  if (deposits.length === 0) {
    return (
      <p className="t-body text-smoke">
        No deposits screened yet. Run the keeper (<span className="font-mono text-ash">pnpm --filter @cordon/keeper record</span>)
        and they appear here within {POLL_MS / 1000}s.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deposits.map((d) => (
        <DepositRow key={d.depositId} d={d} />
      ))}
    </div>
  );
}
