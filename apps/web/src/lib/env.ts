export const ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  cordonAddress: process.env.NEXT_PUBLIC_CORDON_ADDRESS ?? "",
  explorer: (process.env.NEXT_PUBLIC_MONAD_EXPLORER ?? "https://testnet.monadvision.com/").replace(/\/$/, ""),
  chainId: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? "10143"),
} as const;
