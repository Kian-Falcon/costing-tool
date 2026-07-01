/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kf/shared", "@kf/costing-engine", "@kf/importers"]
};

export default nextConfig;
