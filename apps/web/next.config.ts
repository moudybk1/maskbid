import { join } from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@maskbid/protocol", "@maskbid/contracts"],
  reactStrictMode: true,
  devIndicators: false, // the dev-only "N" bubble would sit on every screen of a recorded demo
  distDir: process.env.NEXT_DIST_DIR || ".next", // lets a second dev server run beside another one from the same checkout
  // The VPS image (deploy/Dockerfile) sets this; Vercel and `next dev` leave it off.
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone", outputFileTracingRoot: join(process.cwd(), "../..") }),
};
export default config;
