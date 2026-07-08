export function downloadResponse(body: Buffer | string, contentType: string, filename: string): Response {
  const responseBody = typeof body === "string" ? body : new Uint8Array(body);
  const contentLength = typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
  return new Response(responseBody, {
    headers: {
      "content-type": contentType,
      "content-length": String(contentLength),
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}
