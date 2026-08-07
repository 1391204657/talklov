import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify Liveness UI + AWS SDK used by Flash Check (闪验)
  transpilePackages: [
    "@aws-amplify/ui-react-liveness",
    "@aws-amplify/ui-react",
    "aws-amplify",
  ],
  // Canonical host: www → apex (avoids duplicate GSC / SEO properties)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.talklov.com" }],
        destination: "https://talklov.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
