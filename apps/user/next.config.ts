// import type { NextConfig } from "next";
// import withPWA from "@ducanh2912/next-pwa";

// const nextConfig = {
//   // PWA 설정을 활성화합니다.
//   reactStrictMode: true,
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
// };

// const withPWAConfig = withPWA({
//   dest: "public", // 서비스 워커 파일이 생성될 디렉토리
//   // disable: process.env.NODE_ENV === "development", // 개발 환경에서는 PWA 비활성화
//   disable: false, // 개발 환경에서는 PWA 비활성화
//   // 더 많은 설정 옵션을 추가할 수 있습니다. 예를 들어, `register`나 `skipWaiting` 같은 옵션입니다.
//   webpack: (config: any) => {
//     config.module.rules.push({
//       test: /\.svg$/i,
//       issuer: /\.[jt]sx?$/,
//       use: ["@svgr/webpack"],
//     });
//     return config;
//   },

//   experimental: {
//     turbo: {
//       rules: {
//         "*.svg": {
//           loaders: ["@svgr/webpack"],
//           as: "*.js",
//         },
//       },
//     },
//   },
// });

// export default withPWAConfig(nextConfig);

// apps/user/next.config.js (임시 테스트용)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config: any) => {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
};

// PWA 래핑을 잠시 제거합니다.
module.exports = nextConfig;
