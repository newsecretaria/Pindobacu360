import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropsShort } from "../tipos";

/** Tela final: credito da fonte e chamada para seguir o perfil. */
export const Fechamento: React.FC<{
  fonte: string;
  perfilArroba: string;
  cores: PropsShort["cores"];
  pilhaFonte: string;
}> = ({ fonte, perfilArroba, cores, pilhaFonte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({
    frame,
    fps,
    config: { damping: 18 },
    durationInFrames: 20,
  });
  const escala = interpolate(entrada, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        opacity: entrada,
        transform: `scale(${escala})`,
        display: "flex",
        flexDirection: "column",
        gap: 30,
        maxWidth: 920,
      }}
    >
      <span
        style={{
          fontFamily: pilhaFonte,
          fontWeight: 700,
          fontSize: 44,
          color: cores.texto,
          textShadow: "0 4px 16px rgba(0,0,0,0.7)",
        }}
      >
        Fonte: {fonte}
      </span>

      <div
        style={{
          alignSelf: "flex-start",
          backgroundColor: cores.primaria,
          borderRadius: 18,
          padding: "24px 40px",
        }}
      >
        <span
          style={{
            fontFamily: pilhaFonte,
            fontWeight: 900,
            fontSize: 60,
            color: cores.texto,
            textTransform: "uppercase",
            letterSpacing: -1,
          }}
        >
          Siga {perfilArroba}
        </span>
      </div>
    </div>
  );
};
