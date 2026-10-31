// Robô em pixel art digitando: aparece enquanto o assistente trabalha, para o usuário
// nunca ficar no escuro. Só SVG + CSS (`.robo-*` em app/globals.css), sem imagem.
export function RoboDigitando({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 14"
      width={48}
      height={42}
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-testid="robo-digitando"
      className={className}
    >
      <rect className="robo-antena" x="7" y="0" width="2" height="1" fill="#f7768e" />
      <rect x="7" y="1" width="2" height="1" fill="#565f89" />
      <rect x="3" y="2" width="10" height="6" fill="#7aa2f7" />
      <rect className="robo-olho" x="5" y="4" width="2" height="2" fill="#1a1b26" />
      <rect className="robo-olho" x="9" y="4" width="2" height="2" fill="#1a1b26" />
      <rect x="4" y="8" width="8" height="3" fill="#6b8fe0" />
      <rect x="1" y="12" width="14" height="2" fill="#414868" />
      <rect x="3" y="12" width="1" height="1" fill="#c0caf5" />
      <rect x="6" y="12" width="1" height="1" fill="#c0caf5" />
      <rect x="9" y="12" width="1" height="1" fill="#c0caf5" />
      <rect x="12" y="12" width="1" height="1" fill="#c0caf5" />
      <rect className="robo-mao robo-mao-a" x="3" y="10" width="2" height="2" fill="#e0af68" />
      <rect className="robo-mao robo-mao-b" x="11" y="10" width="2" height="2" fill="#e0af68" />
    </svg>
  );
}
