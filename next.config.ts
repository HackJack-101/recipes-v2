import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp", "@node-rs/argon2"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      {
        source: "/share/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
