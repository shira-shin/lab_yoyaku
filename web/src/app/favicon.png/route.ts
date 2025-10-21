import { Buffer } from "node:buffer";

const base64Png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8z/D/PwAHgwJ/l2QX/wAAAABJRU5ErkJggg==";

export const runtime = "nodejs";

export function GET() {
  return new Response(Buffer.from(base64Png, "base64"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
