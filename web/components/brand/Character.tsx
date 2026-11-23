/* eslint-disable @next/next/no-img-element -- pixel art: o otimizador de imagem borraria os pixels */

// A personagem da LOBAE° (pixel art 52x48). Regra do guia da marca:
// sempre em escala INTEIRA e sem suavização, senão os pixels borram.

const NATIVE_W = 52;
const NATIVE_H = 48;

type Props = {
  /** 1 = 52x48, 2 = 104x96, 3 = 156x144... */
  scale?: 1 | 2 | 3;
  /** olhinhos fechados (versão "piscando" dos sprites) */
  blinking?: boolean;
  className?: string;
};

export function Character({ scale = 2, blinking = false, className }: Props) {
  return (
    <img
      src={blinking ? "/brand/personagem-piscando.png" : "/brand/personagem.png"}
      alt=""
      width={NATIVE_W * scale}
      height={NATIVE_H * scale}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
