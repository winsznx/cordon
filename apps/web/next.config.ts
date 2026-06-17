import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cordon/cleanverse", "@cordon/screening", "@cordon/audit"],
  devIndicators: false,
};

export default nextConfig;
