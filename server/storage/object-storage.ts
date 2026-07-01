export type StoredObject = {
  key: string;
  url?: string;
};

export async function putObject(_input: { key: string; body: Uint8Array; contentType: string }): Promise<StoredObject> {
  throw new Error("Object storage adapter is not configured. Set S3-compatible env vars before enabling uploads.");
}
