import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cordon/cleanverse", "@cordon/screening", "@cordon/audit"],
};

export default nextConfig;
