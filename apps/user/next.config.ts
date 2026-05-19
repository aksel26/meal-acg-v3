import withPWA from "@ducanh2912/next-pwa";

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.ts",
        },
      },
    },
  },
};

const isDevelopment = process.env.NODE_ENV === "development";

const withPWAConfig = withPWA({
  dest: "public",
  disable: isDevelopment,
  register: !isDevelopment,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

export default withPWAConfig(nextConfig);
