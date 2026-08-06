import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify Liveness UI + AWS SDK used by Flash Check (闪验)
  transpilePackages: [
    "@aws-amplify/ui-react-liveness",
    "@aws-amplify/ui-react",
    "aws-amplify",
  ],
};

export default nextConfig;
