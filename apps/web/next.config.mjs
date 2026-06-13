import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pricingCoreSrc = path.resolve(__dirname, "../../packages/pricing-core/src");

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  webpack: (cfg) => {
    cfg.resolve.alias = {
      ...cfg.resolve.alias,
      "@pricing/core": pricingCoreSrc,
    };
    return cfg;
  },
  serverExternalPackages: ["pg"],
};

export default config;
