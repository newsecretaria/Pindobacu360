import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const EXTENSOES_VIDEO = [".mp4", ".mov", ".webm", ".mkv"];

/**
 * Fundo do short: foto ou video da pasta assets/fundos/<categoria>/ com
 * zoom lento (Ken Burns) e overlay escuro para o texto ficar legivel.
 * Sem arquivo, cai num degrade das cores da marca.
 * Nunca usa imagem baixada do portal da noticia.
 */
export const Fundo: React.FC<{
  arquivo: string | null;
  cores: { primaria: string; secundaria: string };
}> = ({ arquivo, cores }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const escala = interpolate(frame, [0, durationInFrames], [1.06, 1.18], {
    extrapolateRight: "clamp",
  });

  const ehVideo =
    arquivo !== null &&
    EXTENSOES_VIDEO.some((ext) => arquivo.toLowerCase().endsWith(ext));

  return (
    <AbsoluteFill style={{ backgroundColor: cores.secundaria }}>
      <AbsoluteFill style={{ transform: `scale(${escala})` }}>
        {arquivo === null ? (
          <AbsoluteFill
            style={{
              background: `linear-gradient(160deg, ${cores.primaria} 0%, ${cores.secundaria} 100%)`,
            }}
          />
        ) : ehVideo ? (
          <OffthreadVideo
            src={staticFile(arquivo)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Img
            src={staticFile(arquivo)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </AbsoluteFill>

      {/* Overlay: escurece o meio e reforça topo e rodapé */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 28%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
