/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint separately with `npm run lint`; a lint warning must never block a free-tier deploy.
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
