import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Paleta } from "../tipos";

/**
 * Tela final: credito da fonte e chamada para seguir.
 *
 * A fonte da noticia vem primeiro e em corpo legivel — cita-la e regra da
 * especificacao, entao ela nao pode ser letrinha de rodape.
 *
 * "Siga" e o arroba ficam em duas linhas: juntos numa linha so, o arroba nao
 * cabe na largura e o texto sai cortado.
 */
export const Fechamento: React.FC<{
  fonte: string;
  perfilArroba: string;
  cores: Paleta;
  destaque: string;
  pilhaFonte: string;
}> = ({ fonte, perfilArroba, cores, destaque, pilhaFonte }) => {
  const frame = useCurrentFrame();

  const regua = interpolate(frame, [0, 18], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const revelar = (atraso: number) =>
    interpolate(frame - atraso, [0, 18], [100, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 4),
    });

  // Nome de portal comprido nao pode empurrar o texto para fora da linha.
  const corpoFonte = fonte.length > 26 ? 36 : 44;
  const corpoChamada = perfilArroba.length > 15 ? 64 : 76;
  const alturaChamada = corpoChamada * 1.12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <div
        style={{
          height: 6,
          width: 240,
          backgroundColor: destaque,
          clipPath: `inset(0 ${100 - regua}% 0 0)`,
        }}
      />

      <div style={{ height: corpoFonte * 1.4, overflow: "hidden" }}>
        <span
          style={{
            display: "block",
            fontFamily: pilhaFonte,
            fontVariationSettings: '"wdth" 100, "wght" 500',
            fontSize: corpoFonte,
            lineHeight: `${corpoFonte * 1.4}px`,
            color: cores.pedra,
            whiteSpace: "nowrap",
            transform: `translateY(${revelar(6)}%)`,
          }}
        >
          Fonte: <span style={{ color: cores.osso }}>{fonte}</span>
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {["Siga", perfilArroba].map((linha, i) => (
          <div
            key={linha}
            style={{ height: alturaChamada, overflow: "hidden" }}
          >
            <span
              style={{
                display: "block",
                fontFamily: pilhaFonte,
                fontVariationSettings: '"wdth" 120, "wght" 900',
                fontSize: corpoChamada,
                lineHeight: `${alturaChamada}px`,
                letterSpacing: -1.5,
                color: i === 0 ? cores.osso : destaque,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                transform: `translateY(${revelar(14 + i * 4)}%)`,
              }}
            >
              {linha}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
