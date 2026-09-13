import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropsShort } from "../tipos";

/** Faixa com a categoria em caixa alta, entra deslizando na abertura. */
export const FaixaCategoria: React.FC<{
  categoria: string;
  cores: PropsShort["cores"];
  pilhaFonte: string;
}> = ({ categoria, cores, pilhaFonte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const x = interpolate(entrada, [0, 1], [-420, 0]);

  return (
    <div
      style={{
        alignSelf: "flex-start",
        transform: `translateX(${x}px)`,
        opacity: entrada,
        backgroundColor: cores.fundoFaixa,
        padding: "14px 34px",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
      }}
    >
      <span
        style={{
          fontFamily: pilhaFonte,
          fontWeight: 900,
          fontSize: 40,
          letterSpacing: 4,
          color: cores.texto,
          textTransform: "uppercase",
        }}
      >
        {categoria}
      </span>
    </div>
  );
};
