import {
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
  RekognitionClient,
} from "@aws-sdk/client-rekognition";
import { GetSessionTokenCommand, STSClient } from "@aws-sdk/client-sts";
import {
  isLivenessEnvConfigured,
  livenessRegion,
} from "@/lib/flashCheck";

function awsCreds() {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
  };
}

export function getRekognitionClient() {
  if (!isLivenessEnvConfigured()) return null;
  return new RekognitionClient({
    region: livenessRegion(),
    credentials: awsCreds(),
  });
}

export function getStsClient() {
  if (!isLivenessEnvConfigured()) return null;
  return new STSClient({
    region: livenessRegion(),
    credentials: awsCreds(),
  });
}

export async function createLivenessSession(): Promise<string> {
  const client = getRekognitionClient();
  if (!client) throw new Error("Flash Check not configured");
  const out = await client.send(
    new CreateFaceLivenessSessionCommand({
      Settings: {
        // Keep audit images for admin review when needed
        AuditImagesLimit: 2,
      },
    })
  );
  if (!out.SessionId) throw new Error("No SessionId from AWS");
  return out.SessionId;
}

export type TempAwsCreds = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
};

/** Short-lived creds so the browser can StartFaceLivenessSession. */
export async function mintLivenessClientCreds(): Promise<TempAwsCreds> {
  const roleArn = process.env.AWS_LIVENESS_ROLE_ARN?.trim();
  const sts = getStsClient();
  if (!sts) throw new Error("Flash Check not configured");

  if (roleArn) {
    const { AssumeRoleCommand } = await import("@aws-sdk/client-sts");
    const out = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `talklov-flash-${Date.now()}`,
        DurationSeconds: 900,
      })
    );
    const c = out.Credentials;
    if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
      throw new Error("AssumeRole returned empty credentials");
    }
    return {
      accessKeyId: c.AccessKeyId,
      secretAccessKey: c.SecretAccessKey,
      sessionToken: c.SessionToken,
      expiration: (c.Expiration ?? new Date(Date.now() + 900_000)).toISOString(),
    };
  }

  // IAM user path: same key with StartFaceLivenessSession permission
  const out = await sts.send(
    new GetSessionTokenCommand({ DurationSeconds: 900 })
  );
  const c = out.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
    throw new Error("GetSessionToken returned empty credentials");
  }
  return {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretAccessKey,
    sessionToken: c.SessionToken,
    expiration: (c.Expiration ?? new Date(Date.now() + 900_000)).toISOString(),
  };
}

export type LivenessResult = {
  confidence: number;
  status: string;
  selfieDataUrl: string | null;
};

export async function fetchLivenessResult(
  sessionId: string
): Promise<LivenessResult> {
  const client = getRekognitionClient();
  if (!client) throw new Error("Flash Check not configured");
  const out = await client.send(
    new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId })
  );
  const confidence = typeof out.Confidence === "number" ? out.Confidence : 0;
  const bytes = out.ReferenceImage?.Bytes;
  let selfieDataUrl: string | null = null;
  if (bytes && bytes.length) {
    const b64 = Buffer.from(bytes).toString("base64");
    const url = `data:image/jpeg;base64,${b64}`;
    // DB constraint ~700k chars; AWS reference frames are usually much smaller
    if (url.length <= 700000) selfieDataUrl = url;
  }
  return {
    confidence,
    status: out.Status || "UNKNOWN",
    selfieDataUrl,
  };
}
