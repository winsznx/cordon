import { ENV } from "@/lib/env";
import { explorerAddress, shortHex } from "@/lib/format";
import { CordonMark } from "./cordon-mark";

export function Footer() {
  const contract = explorerAddress(ENV.cordonAddress) ?? "#";
  return (
    <footer className="mt-[120px] border-t" style={{ borderColor: "var(--hairline)" }}>
      <div className="shell flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <CordonMark />
          <span className="font-semibold">Cordon</span>
          <span className="t-caption text-smoke">A firewall for the money your AI agent receives.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 t-caption text-smoke">
          <span>Cleanverse Build · Monad Testnet</span>
          <a href={contract} target="_blank" rel="noreferrer" className="font-mono transition-colors hover:text-bone">
            {shortHex(ENV.cordonAddress)}
          </a>
          <span>MIT</span>
        </div>
      </div>
    </footer>
  );
}
