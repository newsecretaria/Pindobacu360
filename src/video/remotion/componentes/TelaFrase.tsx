import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ajustarFrase, type Paleta } from "../tipos";

/**
 * Uma frase do resumo por tela, no mesmo campo de tinta onde a manchete
 * estava — a arquitetura nao muda entre as telas, so o conteudo. E o que faz
 * o video parecer uma peca so, e nao slides emendados.
 *
 * O progresso e uma regua fina que avanca, nao as bolinhas de stories: as
 * bolinhas sao a interface do proprio Instagram, e copia-las e o caminho
 * mais curto para parecer generico.
 */
export const TelaFrase: React.FC<{
  texto: string;
  indice: number;
  total: number;
  duracao: number;
  cores: Paleta;
  destaque: string;
  pilhaFonte: string;
  larguraUtil: number;
  alturaUtil: number;
}> = ({
  texto,
  indice,
  total,
  duracao,
  cores,
  destaque,
  pilhaFonte,
  larguraUtil,
  alturaUtil,
}) => {
  const frame = useCurrentFrame();
  const { tamanho, linhas, alturaLinha } = ajustarFrase(
    texto,
    larguraUtil,
    alturaUtil,
  );

  const saida = interpolate(frame, [duracao - 8, duracao], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacidadeSaida = interpolate(frame, [duracao - 8, duracao], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // A regua acumula as telas ja lidas e preenche a atual em tempo real.
  const nesta = interpolate(frame, [0, duracao], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progresso = ((indice + nesta) / total) * 100;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 46,
        transform: `translateY(${saida}px)`,
        opacity: opacidadeSaida,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {linhas.map((linha, i) => {
          const subida = interpolate(frame - i * 3, [0, 15], [100, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: (t) => 1 - Math.pow(1 - t, 4),
          });
          return (
            <div
              key={i}
              style={{ height: alturaLinha, overflow: "hidden" }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: pilhaFonte,
                  fontVariationSettings: '"wdth" 100, "wght" 500',
                  fontSize: tamanho,
                  lineHeight: `${alturaLinha}px`,
                  letterSpacing: -0.2,
                  color: cores.osso,
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

      <div
        style={{
          height: 4,
          width: 420,
          backgroundColor: "rgba(244,239,230,0.18)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progresso}%`,
            backgroundColor: destaque,
          }}
        />
      </div>
    </div>
  );
};
