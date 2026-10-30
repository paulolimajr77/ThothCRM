/**
 * O ANDAMENTO DO TURNO, ao vivo — para a pessoa ver o que o assistente está fazendo.
 *
 * O chat responde de uma vez (sem streaming, de propósito: ver `assistente-turn.ts`).
 * Durante esses segundos a tela só mostrava "Pensando…" e a pessoa achava que
 * travou. Aqui as ferramentas anotam o que acontece (abrir a tela, começar o
 * teste, o resultado dele) e a tela lê pela rota `GET .../progresso`.
 *
 * Vive SÓ na memória deste processo, de propósito: é cortesia, não dado. Se a
 * instalação tiver mais de um processo, ou ele reiniciar, a pessoa vê o
 * "Pensando…" de antes e o resultado final continua chegando completo na
 * resposta — nada depende deste mapa. A chave leva organização E pessoa, para
 * ninguém ler o andamento de outro.
 */
import type { EventoDoTurno } from "./ferramentas/tipos";

const VIDA_DO_TURNO_MS = 10 * 60 * 1000;
const MAXIMO_DE_TURNOS = 200;
const MAXIMO_DE_EVENTOS_POR_TURNO = 30;

interface Registro {
  criadoEm: number;
  eventos: EventoDoTurno[];
}

const turnos = new Map<string, Registro>();

function chave(orgId: string, userId: string, turnId: string): string {
  return `${orgId}:${userId}:${turnId}`;
}

function varrer(agora: number): void {
  for (const [k, r] of turnos) {
    if (agora - r.criadoEm > VIDA_DO_TURNO_MS) turnos.delete(k);
  }
  // Teto duro: descarta os mais antigos (Map guarda a ordem de inserção).
  while (turnos.size > MAXIMO_DE_TURNOS) {
    const primeiro = turnos.keys().next();
    if (primeiro.done) break;
    turnos.delete(primeiro.value);
  }
}

export function registrarEventoDoTurno(
  orgId: string,
  userId: string,
  turnId: string,
  evento: EventoDoTurno,
  agora: number = Date.now(),
): void {
  varrer(agora);
  const k = chave(orgId, userId, turnId);
  const registro = turnos.get(k) ?? { criadoEm: agora, eventos: [] };
  if (registro.eventos.length < MAXIMO_DE_EVENTOS_POR_TURNO) registro.eventos.push(evento);
  turnos.set(k, registro);
}

/** Os eventos a partir do `desde` (índice já visto pela tela). */
export function lerEventosDoTurno(
  orgId: string,
  userId: string,
  turnId: string,
  desde: number,
): { eventos: EventoDoTurno[]; proximo: number } {
  const registro = turnos.get(chave(orgId, userId, turnId));
  if (!registro) return { eventos: [], proximo: desde };
  const inicio = Math.max(0, desde);
  return { eventos: registro.eventos.slice(inicio), proximo: registro.eventos.length };
}

export function esquecerTurno(orgId: string, userId: string, turnId: string): void {
  turnos.delete(chave(orgId, userId, turnId));
}
