// Faixa de "dither" em pixels: a transição do cobalto pra tinta da capa da LOBAE°.
// Usa dither ordenado (matriz de Bayer 4x4, a técnica dos jogos antigos):
// cada linha preenche um pouco mais de pixels que a anterior, até ficar sólida.

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type Props = {
  /** quantos pixels de largura (colunas) */
  cols?: number;
  /** quantas linhas até ficar sólido */
  rows?: number;
  /** tamanho de cada pixel na tela */
  cell?: number;
  /** cor dos pixels (a cor de fundo é a do elemento pai) */
  color?: string;
  className?: string;
};

export function PixelDither({ cols = 32, rows = 8, cell = 8, color = "#0B0E2A", className }: Props) {
  const squares: string[] = [];
  for (let y = 0; y < rows; y++) {
    // densidade sobe linha a linha: começa ~1/16 e termina sólido
    const level = Math.round(((y + 1) / rows) * 16);
    for (let x = 0; x < cols; x++) {
      if (BAYER_4[y % 4]![x % 4]! < level) squares.push(`M${x} ${y}h1v1h-1z`);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      width={cols * cell}
      height={rows * cell}
      shapeRendering="crispEdges"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMinYMax slice"
    >
      <path fill={color} d={squares.join("")} />
    </svg>
  );
}
