/**
 * `detail` legível para `HandlerResult` (vira `event_log.last_error`).
 *
 * Erro do PostgREST via supabase-js NÃO é `instanceof Error` — é um objeto
 * simples `{ message, code, details, hint }` (o `serviceForEvent` joga esse
 * objeto para cima com `throw error`). O `String(err)` genérico transforma
 * esse objeto em `"[object Object]"` e a linha do evento morto perde a única
 * evidência do que aconteceu (medido: `followup-gatilho-lead.v1` com
 * `last_error = "[object Object]"`, attempts 5, sem dizer o porquê).
 */
export function detalheDoErro(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err !== null && typeof err === "object") {
    const o = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    const partes = [o.code, o.message, o.details, o.hint].filter(
      (p): p is string => typeof p === "string" && p.trim() !== "",
    );
    if (partes.length > 0) return partes.join(" | ").slice(0, 500);
    try {
      return JSON.stringify(o).slice(0, 500);
    } catch {
      return "erro_objeto_nao_serializavel";
    }
  }
  if (err === null || err === undefined) return "erro_desconhecido";
  return String(err);
}
