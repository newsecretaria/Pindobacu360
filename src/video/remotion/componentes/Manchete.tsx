import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropsShort } from "../tipos";

/** Manchete em caixa alta, entrando palavra por palavra. */
export const Manchete: React.FC<{
  texto: string;
  cores: PropsShort["cores"];
  pilhaFonte: string;
  /** Frames de atraso antes da primeira palavra */
  atraso?: number;
}> = ({ texto, cores, pilhaFonte, atraso = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palavras = texto.trim().split(/\s+/).filter(Boolean);

  // Manchete longa diminui de corpo para nao invadir a margem segura.
  const tamanho = texto.length > 55 ? 84 : texto.length > 40 ? 96 : 112;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0 20px",
        maxWidth: 920,
      }}
    >
      {palavras.map((palavra, i) => {
        const entrada = spring({
          frame: frame - atraso - i * 3,
          fps,
          config: { damping: 14, mass: 0.6 },
          durationInFrames: 22,
        });
        const y = interpolate(entrada, [0, 1], [40, 0]);
        return (
          <span
            key={`${palavra}-${i}`}
            style={{
              fontFamily: pilhaFonte,
              fontWeight: 900,
              fontSize: tamanho,
              lineHeight: 1.05,
              color: cores.texto,
              textTransform: "uppercase",
              letterSpacing: -1,
              opacity: entrada,
              transform: `translateY(${y}px)`,
              textShadow: "0 6px 22px rgba(0,0,0,0.8)",
            }}
          >
            {palavra}
          </span>
        );
      })}
    </div>
  );
};
