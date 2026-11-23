// Logo LOBAE° desenhado a partir dos SVGs oficiais da marca (pasta marca/).
// Cada célula é 1x1 numa grade: símbolo 10x10, logo horizontal 42x10.
// shape-rendering="crispEdges" mantém os pixels nítidos em qualquer tamanho.

const L_SHAPE = "M0 0h1v1h-1zM1 0h1v1h-1zM2 0h1v1h-1zM0 1h1v1h-1zM1 1h1v1h-1zM2 1h1v1h-1zM0 2h1v1h-1zM1 2h1v1h-1zM2 2h1v1h-1zM0 3h1v1h-1zM1 3h1v1h-1zM2 3h1v1h-1zM0 4h1v1h-1zM1 4h1v1h-1zM2 4h1v1h-1zM0 5h1v1h-1zM1 5h1v1h-1zM2 5h1v1h-1zM0 6h1v1h-1zM1 6h1v1h-1zM2 6h1v1h-1zM0 7h1v1h-1zM1 7h1v1h-1zM2 7h1v1h-1zM3 7h1v1h-1zM4 7h1v1h-1zM5 7h1v1h-1zM6 7h1v1h-1zM7 7h1v1h-1zM8 7h1v1h-1zM9 7h1v1h-1zM0 8h1v1h-1zM1 8h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM9 8h1v1h-1zM0 9h1v1h-1zM1 9h1v1h-1zM2 9h1v1h-1zM3 9h1v1h-1zM4 9h1v1h-1zM5 9h1v1h-1zM6 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM9 9h1v1h-1z";
const RING = "M4 0h1v1h-1zM5 0h1v1h-1zM6 0h1v1h-1zM7 0h1v1h-1zM8 0h1v1h-1zM9 0h1v1h-1zM4 1h1v1h-1zM5 1h1v1h-1zM6 1h1v1h-1zM7 1h1v1h-1zM8 1h1v1h-1zM9 1h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM8 2h1v1h-1zM9 2h1v1h-1zM4 3h1v1h-1zM5 3h1v1h-1zM8 3h1v1h-1zM9 3h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM7 4h1v1h-1zM8 4h1v1h-1zM9 4h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM7 5h1v1h-1zM8 5h1v1h-1zM9 5h1v1h-1z";
const WORDMARK = "M13 3h1v1h-1zM13 4h1v1h-1zM13 5h1v1h-1zM13 6h1v1h-1zM13 7h1v1h-1zM13 8h1v1h-1zM13 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM16 9h1v1h-1zM17 9h1v1h-1zM20 3h1v1h-1zM21 3h1v1h-1zM22 3h1v1h-1zM19 4h1v1h-1zM23 4h1v1h-1zM19 5h1v1h-1zM23 5h1v1h-1zM19 6h1v1h-1zM23 6h1v1h-1zM19 7h1v1h-1zM23 7h1v1h-1zM19 8h1v1h-1zM23 8h1v1h-1zM20 9h1v1h-1zM21 9h1v1h-1zM22 9h1v1h-1zM25 3h1v1h-1zM26 3h1v1h-1zM27 3h1v1h-1zM28 3h1v1h-1zM25 4h1v1h-1zM29 4h1v1h-1zM25 5h1v1h-1zM29 5h1v1h-1zM25 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM25 7h1v1h-1zM29 7h1v1h-1zM25 8h1v1h-1zM29 8h1v1h-1zM25 9h1v1h-1zM26 9h1v1h-1zM27 9h1v1h-1zM28 9h1v1h-1zM32 3h1v1h-1zM33 3h1v1h-1zM34 3h1v1h-1zM31 4h1v1h-1zM35 4h1v1h-1zM31 5h1v1h-1zM35 5h1v1h-1zM31 6h1v1h-1zM32 6h1v1h-1zM33 6h1v1h-1zM34 6h1v1h-1zM35 6h1v1h-1zM31 7h1v1h-1zM35 7h1v1h-1zM31 8h1v1h-1zM35 8h1v1h-1zM31 9h1v1h-1zM35 9h1v1h-1zM37 3h1v1h-1zM38 3h1v1h-1zM39 3h1v1h-1zM40 3h1v1h-1zM41 3h1v1h-1zM37 4h1v1h-1zM37 5h1v1h-1zM37 6h1v1h-1zM38 6h1v1h-1zM39 6h1v1h-1zM40 6h1v1h-1zM37 7h1v1h-1zM37 8h1v1h-1zM37 9h1v1h-1zM38 9h1v1h-1zM39 9h1v1h-1zM40 9h1v1h-1zM41 9h1v1h-1z";

type Props = {
  /** só o símbolo L° (quadrado) ou o logo horizontal com "LOBAE" */
  variant?: "symbol" | "horizontal";
  /** altura em px. Use múltiplos de 10 pra cada célula virar pixels inteiros */
  height?: number;
  /** cor do L e das letras (o anel é sempre laranja sinal) */
  color?: string;
  className?: string;
  title?: string;
};

export function LobaeLogo({
  variant = "horizontal",
  height = 20,
  color = "currentColor",
  className,
  title = "LOBAE°",
}: Props) {
  const cols = variant === "symbol" ? 10 : 42;
  return (
    <svg
      viewBox={`0 0 ${cols} 10`}
      height={height}
      width={(height / 10) * cols}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
      className={className}
    >
      <path fill={color} d={L_SHAPE} />
      <path fill="#FF5A1F" d={RING} />
      {variant === "horizontal" && <path fill={color} d={WORDMARK} />}
    </svg>
  );
}
