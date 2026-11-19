import { requireSupportWrite } from "@/lib/impersonate/support";
import { NextRequest } from "next/server";
import { POST as resolve } from "../resolver/route";
/** Retentativa usa exatamente as mesmas guardas; nunca faz HTTP no request humano. */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const body: unknown = await req.json().catch(() => null);
  return resolve(
    new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({
        ...(typeof body === "object" && body !== null ? body : {}),
        choice: "retry",
      }),
    }),
    context,
  );
}
