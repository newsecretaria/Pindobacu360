import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ajustarManchete, type Paleta } from "../tipos";

/**
 * Manchete em caixa alta, expandida e pesada — letreiro pintado, legivel a
 * um braco de distancia.
 *
 * Cada linha sobe de tras de uma mascara, em cascata. E diferente de fazer
 * as palavras aparecerem com opacidade: a mascara da a sensacao de que o
 * texto ja existia e esta sendo descoberto, que e o que separa uma peca
 * animada de um template com fade.
 */
export const Manchete: React.FC<{
  texto: string;
  cores: Paleta;
  pilhaFonte: string;
  larguraUtil: number;
  alturaUtil: number;
  /** Frames de atraso antes da primeira linha */
  atraso?: number;
}> = ({ texto, cores, pilhaFonte, larguraUtil, alturaUtil, atraso = 0 }) => {
  const frame = useCurrentFrame();
  const { tamanho, linhas, alturaLinha } = ajustarManchete(
    texto,
    larguraUtil,
    alturaUtil,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {linhas.map((linha, i) => {
        const inicio = atraso + i * 4;
        const subida = interpolate(frame - inicio, [0, 16], [100, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: (t) => 1 - Math.pow(1 - t, 4),
        });

        return (
          <div
            key={`${linha}-${i}`}
            style={{ height: alturaLinha, overflow: "hidden" }}
          >
            <span
              style={{
                display: "block",
                fontFamily: pilhaFonte,
                fontVariationSettings: '"wdth" 122, "wght" 900',
                fontSize: tamanho,
                lineHeight: `${alturaLinha}px`,
                letterSpacing: -1.5,
                color: cores.osso,
                textTransform: "uppercase",
                transform: `translateY(${subida}%)`,
                whiteSpace: "nowrap",
              }}
            >
              {linha}
            </span>
          </div>
        );
      })}
    </div>
  );
};
