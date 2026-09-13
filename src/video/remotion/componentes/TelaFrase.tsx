import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropsShort } from "../tipos";

/** Uma frase do resumo por tela, com entrada e saida suaves. */
export const TelaFrase: React.FC<{
  texto: string;
  indice: number;
  total: number;
  duracao: number;
  cores: PropsShort["cores"];
  pilhaFonte: string;
}> = ({ texto, indice, total, duracao, cores, pilhaFonte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.7 },
    durationInFrames: 20,
  });
  const saida = interpolate(frame, [duracao - 10, duracao], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(entrada, [0, 1], [48, 0]);

  return (
    <div
      style={{
        opacity: Math.min(entrada, saida),
        transform: `translateY(${y}px)`,
        maxWidth: 920,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.55)",
          borderLeft: `10px solid ${cores.destaque}`,
          borderRadius: 18,
          padding: "34px 38px",
        }}
      >
        <span
          style={{
            fontFamily: pilhaFonte,
            fontWeight: 800,
            fontSize: texto.length > 70 ? 56 : 64,
            lineHeight: 1.22,
            color: cores.texto,
            textShadow: "0 4px 16px rgba(0,0,0,0.7)",
          }}
        >
          {texto}
        </span>
      </div>

      {/* Marcadores de progresso: quantas telas ja passaram */}
      <div style={{ display: "flex", gap: 12 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === indice ? 64 : 28,
              height: 10,
              borderRadius: 5,
              backgroundColor:
                i <= indice ? cores.destaque : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
};
