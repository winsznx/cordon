import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@usecordon/cleanverse", "@usecordon/screening", "@cordon/audit"],
  devIndicators: false,
};

export default nextConfig;
