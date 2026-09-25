import type { NextConfig } from "next";

/**
 * Static export (PHASE2_PLAN §4): the site is plain HTML built from the content
 * snapshot, so it can be hosted on GitHub Pages under NEXT_PUBLIC_BASE_PATH.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
