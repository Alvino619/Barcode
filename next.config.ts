import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { localPatterns: [{ pathname: "/uploads/**", search: "" }], remotePatterns: [] },
};
export default nextConfig;
