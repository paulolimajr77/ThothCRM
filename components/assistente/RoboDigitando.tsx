// Robô em pixel art que trabalha enquanto o assistente roda: digita, pensa e escreve
// no bloco, em ciclo, para o usuário nunca ficar no escuro. Só SVG + CSS (`.robo-*` em
// app/globals.css, cores por token claro/escuro), sem imagem.
export function RoboDigitando({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      width={90}
      height={60}
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-testid="robo-digitando"
      className={`robo-svg ${className ?? ""}`.trim()}
    >
      {/* antena */}
      <rect className="robo-brilho" x="13" y="0" width="2" height="2" />
      {/* orelhas */}
      <rect className="robo-c-o" x="5" y="4" width="3" height="5" />
      <rect className="robo-c-b" x="6" y="5" width="2" height="3" />
      <rect className="robo-c-o" x="20" y="4" width="3" height="5" />
      <rect className="robo-c-b" x="20" y="5" width="2" height="3" />
      {/* cabeça */}
      <rect className="robo-c-o" x="9" y="2" width="10" height="1" />
      <rect className="robo-c-o" x="8" y="3" width="12" height="7" />
      <rect className="robo-c-o" x="9" y="10" width="10" height="1" />
      <rect className="robo-c-b" x="9" y="3" width="10" height="7" />
      <rect className="robo-c-l" x="10" y="3" width="4" height="1" />
      <rect className="robo-c-v" x="10" y="4" width="8" height="5" />
      <rect className="robo-c-r" x="10" y="7" width="1" height="1" />
      <rect className="robo-c-r" x="17" y="7" width="1" height="1" />
      {/* corpo escondido atrás do notebook */}
      <rect className="robo-c-o" x="11" y="11" width="6" height="2" />
      <rect className="robo-c-b" x="12" y="11" width="4" height="2" />
      {/* notebook (tampa vista de trás) + base com teclas */}
      <rect className="robo-c-o" x="8" y="13" width="12" height="4" />
      <rect className="robo-c-t" x="9" y="14" width="10" height="2" />
      <rect className="robo-c-b" x="13" y="14" width="2" height="1" />
      <rect className="robo-c-o" x="5" y="17" width="18" height="2" />
      <rect className="robo-c-t" x="6" y="17" width="16" height="1" />
      <rect className="robo-c-l" x="8" y="17" width="1" height="1" />
      <rect className="robo-c-l" x="11" y="17" width="1" height="1" />
      <rect className="robo-c-l" x="14" y="17" width="1" height="1" />
      <rect className="robo-c-l" x="17" y="17" width="1" height="1" />
      <rect className="robo-c-l" x="20" y="17" width="1" height="1" />

      {/* fase 1: digitando */}
      <g className="robo-f robo-f1">
        <rect className="robo-c-e" x="11" y="5" width="2" height="2" />
        <rect className="robo-c-e" x="15" y="5" width="2" height="2" />
        <rect className="robo-c-e" x="13" y="8" width="2" height="1" />
        <rect className="robo-c-m robo-mao-a" x="6" y="15" width="2" height="2" />
        <rect className="robo-c-m robo-mao-b" x="20" y="15" width="2" height="2" />
        <rect className="robo-c-m robo-faisca" x="9" y="12" width="1" height="1" />
        <rect className="robo-c-m robo-faisca robo-faisca-b" x="19" y="12" width="1" height="1" />
      </g>

      {/* fase 2: pensando (mão no queixo, balão com pontinhos) */}
      <g className="robo-f robo-f2">
        <rect className="robo-c-e" x="12" y="4" width="2" height="2" />
        <rect className="robo-c-e" x="16" y="4" width="2" height="2" />
        <rect className="robo-c-e" x="14" y="8" width="2" height="1" />
        <rect className="robo-c-m" x="6" y="15" width="2" height="2" />
        <rect className="robo-c-o" x="18" y="9" width="3" height="4" />
        <rect className="robo-c-m" x="18" y="10" width="2" height="2" />
        <rect className="robo-c-o" x="21" y="3" width="1" height="1" />
        <rect className="robo-c-p" x="22" y="0" width="8" height="4" />
        <rect className="robo-c-p" x="21" y="4" width="1" height="1" />
        <rect className="robo-c-o" x="22" y="0" width="8" height="1" />
        <rect className="robo-c-o" x="22" y="3" width="8" height="1" />
        <rect className="robo-c-o" x="22" y="0" width="1" height="4" />
        <rect className="robo-c-o" x="29" y="0" width="1" height="4" />
        <rect className="robo-c-e robo-ponto robo-ponto-1" x="24" y="2" width="1" height="1" />
        <rect className="robo-c-e robo-ponto robo-ponto-2" x="26" y="2" width="1" height="1" />
        <rect className="robo-c-e robo-ponto robo-ponto-3" x="28" y="2" width="1" height="1" />
      </g>

      {/* fase 3: escrevendo no bloco */}
      <g className="robo-f robo-f3">
        <rect className="robo-c-e" x="12" y="5" width="2" height="2" />
        <rect className="robo-c-e" x="16" y="5" width="2" height="2" />
        <rect className="robo-c-e" x="13" y="8" width="2" height="1" />
        <rect className="robo-c-m" x="6" y="15" width="2" height="2" />
        <rect className="robo-c-o" x="22" y="9" width="8" height="10" />
        <rect className="robo-c-p" x="23" y="10" width="6" height="8" />
        <rect className="robo-c-l" x="24" y="12" width="4" height="1" />
        <rect className="robo-c-l" x="24" y="14" width="3" height="1" />
        <rect className="robo-c-e robo-risco" x="24" y="16" width="4" height="1" />
        <rect className="robo-c-m robo-caneta" x="22" y="14" width="2" height="2" />
        <rect className="robo-c-o robo-caneta" x="24" y="13" width="1" height="2" />
      </g>
    </svg>
  );
}
