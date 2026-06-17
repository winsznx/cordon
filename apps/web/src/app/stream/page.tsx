import { StreamLive } from "@/components/stream-live";
import { Eyebrow } from "@/components/ui";
import { fetchDeposits } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function StreamPage() {
  const initial = await fetchDeposits({ limit: 60 }).catch(() => []);

  return (
    <div className="pb-10">
      <div className="shell flex flex-col gap-6 pb-12 pt-20">
        <div className="flex items-center gap-3">
          <Eyebrow>Live inbound feed</Eyebrow>
          <span className="pulse-dot inline-flex items-center gap-2 t-caption text-plum">
            <span className="size-1.5 rounded-full bg-plum" aria-hidden="true" />
            live
          </span>
        </div>
        <h1 className="t-heading-lg max-w-[22ch]">Every inbound payment, screened as it lands.</h1>
        <p className="t-subheading measure text-ash">
          Each row is a real verdict the keeper anchored on Monad. Cleared funds sweep to operating; quarantined funds
          are contained. Refreshes every 4 seconds.
        </p>
      </div>
      <div className="shell">
        <StreamLive initial={initial} />
      </div>
    </div>
  );
}
