"use client";

import { useState } from "react";

// Robô em pixel art que trabalha enquanto o assistente roda: digita, pensa e escreve
// no bloco, em ciclo, para o usuário nunca ficar no escuro. Cada execução sorteia um
// de cinco modelos. Só SVG + CSS (`.robo-*` em app/globals.css, cores por token
// claro/escuro), sem imagem. Traço de 1 pixel da grade (a grade é 34x23, 2 px por casa).
//
// Legenda dos desenhos: o contorno, b corpo, l brilho, v tela escura, e olho/boca
// ciano, E olho escuro, r bochecha/orelha, m amarelo, g bolinha da antena, "." vazio.
// Cada modelo tem 16 colunas por 16 linhas e senta atrás do teclado.
const MODELOS: string[][] = [
  // caixa com antena
  [
    ".......gg.......",
    ".......oo.......",
    ".oooooooooooooo.",
    "ollllbbbbbbbbbbo",
    "obbbbbbbbbbbbbbo",
    "obbbEEbbbbEEbbbo",
    "obbbEEbbbbEEbbbo",
    "obbbbbbbbbbbbbbo",
    "obbrbbbooooobrbo",
    "obbbbbbbbbbbbbbo",
    ".oooooooooooooo.",
    "...oooooooooo...",
    "...obbbbbbbbo...",
    "...obbbllbbbo...",
    "...obbbbbbbbo...",
    "...oooooooooo...",
  ],
  // televisão
  [
    "................",
    "................",
    "oooooooooooooooo",
    "obbbbbbbbbbbbbbo",
    "obvvvvvvvvvvvvbo",
    "obvveevvvveevvbo",
    "obvveevvvveevvbo",
    "obvvvveeeevvvvbo",
    "obvvvvvvvvvvvvbo",
    "obbbbbbbbbbbbbbo",
    "oooooooooooooooo",
    "....oooooooo....",
    "....obbbbbbo....",
    "....oblbbmbo....",
    "....obbbbbbo....",
    "....oooooooo....",
  ],
  // gatinho de orelhas
  [
    "..oo........oo..",
    ".orro......orro.",
    ".oooooooooooooo.",
    ".ollllbbbbbbbbo.",
    ".obbbbbbbbbbbbo.",
    ".obbEEbbbbEEbbo.",
    ".obbbbbbbbbbbbo.",
    ".obbbbbEEbbbbbo.",
    ".obbrbbbbbbrbbo.",
    ".oooooooooooooo.",
    "....oooooooo....",
    "....obbbbbbo....",
    "....obbllbbo....",
    "....obbbbbbo....",
    "....oooooooo....",
    "................",
  ],
  // cápsula com visor
  [
    "......oooo......",
    ".....obbbbo.....",
    "....obbbbbbo....",
    "...obbbbbbbbo...",
    "...obvvvvvvbo...",
    "...obveeveebo...",
    "...obvvvvvvbo...",
    "...obbbbbbbbo...",
    "...obllllllbo...",
    "...obbbbbbbbo...",
    "...obllllllbo...",
    "...obbbbbbbbo...",
    "...obllllllbo...",
    "...obbbbbbbbo...",
    "...oooooooooo...",
    "................",
  ],
  // monitor listrado
  [
    ".......gg.......",
    ".oooooooooooooo.",
    ".obbbbbbbbbbbbo.",
    ".obvvvvvvvvvvbo.",
    ".obvveevveevvbo.",
    ".obvvvvvvvvvvbo.",
    ".obvvveeeevvvbo.",
    ".obvvvvvvvvvvbo.",
    ".obbbbbbbbbbbbo.",
    ".oooooooooooooo.",
    "..oooooooooooo..",
    "..ommmmmmmmmmo..",
    "..obbbbbbbbbbo..",
    "..ommmmmmmmmmo..",
    "..obbbbbbbbbbo..",
    "..oooooooooooo..",
  ],
];

function rects(linhas: string[], dx: number) {
  const saida: { chave: string; x: number; y: number; w: number; letra: string }[] = [];
  linhas.forEach((linha, y) => {
    let i = 0;
    while (i < linha.length) {
      const letra = linha[i]!;
      let j = i;
      while (j < linha.length && linha[j] === letra) j++;
      if (letra !== ".") saida.push({ chave: `${y}-${i}`, x: dx + i, y, w: j - i, letra });
      i = j;
    }
  });
  return saida;
}

export function RoboDigitando({ className }: { className?: string }) {
  const [modelo] = useState(() => Math.floor(Math.random() * MODELOS.length));
  return (
    <svg
      viewBox="0 0 34 23"
      width={68}
      height={46}
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-testid="robo-digitando"
      className={`robo-svg ${className ?? ""}`.trim()}
    >
      {rects(MODELOS[modelo]!, 9).map((r) => (
        <rect
          key={r.chave}
          className={`robo-c-${r.letra}${r.letra === "e" || r.letra === "E" ? " robo-olho" : ""}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
        />
      ))}
      {/* teclado */}
      <rect className="robo-c-o" x="7" y="16" width="20" height="5" />
      <rect className="robo-c-t" x="8" y="17" width="18" height="3" />
      <rect className="robo-c-l" x="10" y="18" width="2" height="1" />
      <rect className="robo-c-l" x="14" y="18" width="2" height="1" />
      <rect className="robo-c-l" x="18" y="18" width="2" height="1" />
      <rect className="robo-c-l" x="22" y="18" width="2" height="1" />

      {/* fase 1: digitando */}
      <g className="robo-f robo-f1">
        <rect className="robo-c-m robo-mao-a" x="11" y="16" width="2" height="2" />
        <rect className="robo-c-m robo-mao-b" x="21" y="16" width="2" height="2" />
        <rect className="robo-c-m robo-faisca" x="9" y="15" width="1" height="1" />
        <rect className="robo-c-m robo-faisca robo-faisca-b" x="24" y="15" width="1" height="1" />
      </g>

      {/* fase 2: pensando (mão no rosto, balão com pontinhos) */}
      <g className="robo-f robo-f2">
        <rect className="robo-c-m" x="11" y="16" width="2" height="2" />
        <rect className="robo-c-o" x="25" y="9" width="3" height="8" />
        <rect className="robo-c-m" x="26" y="10" width="1" height="6" />
        <rect className="robo-c-o" x="26" y="0" width="8" height="5" />
        <rect className="robo-c-p" x="27" y="1" width="6" height="3" />
        <rect className="robo-c-o" x="25" y="5" width="1" height="1" />
        <rect className="robo-c-E robo-ponto robo-ponto-1" x="28" y="2" width="1" height="1" />
        <rect className="robo-c-E robo-ponto robo-ponto-2" x="30" y="2" width="1" height="1" />
        <rect className="robo-c-E robo-ponto robo-ponto-3" x="32" y="2" width="1" height="1" />
      </g>

      {/* fase 3: escrevendo no bloco */}
      <g className="robo-f robo-f3">
        <rect className="robo-c-m" x="11" y="16" width="2" height="2" />
        <rect className="robo-c-o" x="27" y="11" width="7" height="11" />
        <rect className="robo-c-p" x="28" y="12" width="5" height="9" />
        <rect className="robo-c-l" x="29" y="14" width="3" height="1" />
        <rect className="robo-c-l" x="29" y="16" width="2" height="1" />
        <rect className="robo-c-v robo-risco" x="29" y="18" width="3" height="1" />
        <rect className="robo-c-m robo-caneta" x="27" y="17" width="2" height="2" />
      </g>
    </svg>
  );
}
