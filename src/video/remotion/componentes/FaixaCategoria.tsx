import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Paleta } from "../tipos";

/**
 * O bloco de categoria — a assinatura do formato.
 *
 * Ele nao flutua sobre a foto: fica pousado exatamente na emenda entre a foto
 * e o campo de tinta, metade em cima de cada um. E o unico elemento que
 * atravessa a divisao do layout, e e o que faz o frame ser reconhecivel como
 * deste perfil. Entra como pincelada, da esquerda para a direita.
 */
export const FaixaCategoria: React.FC<{
  categoria: string;
  cores: Paleta;
  destaque: string;
  pilhaFonte: string;
  /** Frames de atraso antes da pincelada */
  atraso?: number;
}> = ({ categoria, cores, destaque, pilhaFonte, atraso = 0 }) => {
  const frame = useCurrentFrame();

  const pincelada = interpolate(frame - atraso, [0, 14], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <div
      style={{
        alignSelf: "flex-start",
        backgroundColor: destaque,
        padding: "16px 30px 14px",
        clipPath: `inset(0 ${100 - pincelada}% 0 0)`,
      }}
    >
      <span
        style={{
          fontFamily: pilhaFonte,
          fontVariationSettings: '"wdth" 76, "wght" 800',
          fontSize: 38,
          lineHeight: 1,
          letterSpacing: 5,
          color: cores.tinta,
          textTransform: "uppercase",
          display: "block",
        }}
      >
        {categoria}
      </span>
    </div>
  );
};
