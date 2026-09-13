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
import type { Paleta } from "../tipos";

const EXTENSOES_VIDEO = [".mp4", ".mov", ".webm", ".mkv"];

/**
 * Foto ou video de assets/fundos/<categoria>/, tratado em duotone na cor da
 * noticia e com deriva lenta (Ken Burns).
 *
 * O duotone nao e enfeite: as fotos que o Ricardo vai juntar tem luz, camera
 * e enquadramento muito diferentes entre si. Passar todas pelo mesmo
 * tratamento faz o perfil ter uma cara so, e garante contraste com o texto
 * sem precisar de sombra por cima.
 *
 * Sem foto na pasta, o campo vira cor chapada — decisao, nao degrade de
 * placeholder.
 */
export const Fundo: React.FC<{
  arquivo: string | null;
  cores: Paleta;
  destaque: string;
  /** Altura ocupada pela foto, de 0 a 1 */
  emenda: number;
}> = ({ arquivo, cores, destaque, emenda }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();

  const escala = interpolate(frame, [0, durationInFrames], [1.04, 1.16], {
    extrapolateRight: "clamp",
  });
  const desvio = interpolate(frame, [0, durationInFrames], [0, -18], {
    extrapolateRight: "clamp",
  });

  const ehVideo =
    arquivo !== null &&
    EXTENSOES_VIDEO.some((ext) => arquivo.toLowerCase().endsWith(ext));

  const alturaFoto = Math.round(height * emenda);

  return (
    <AbsoluteFill style={{ backgroundColor: cores.tinta }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: alturaFoto,
          overflow: "hidden",
          backgroundColor: destaque,
        }}
      >
        {arquivo !== null && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `scale(${escala}) translateY(${desvio}px)`,
                filter: "grayscale(1) contrast(1.18) brightness(0.92)",
              }}
            >
              {ehVideo ? (
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
            </div>

            {/* Duotone: preserva a luminancia da foto e troca o matiz */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(175deg, ${destaque} 0%, ${cores.tinta} 100%)`,
                mixBlendMode: "color",
              }}
            />
            {/*
              Sombra no topo para a assinatura ficar legivel sobre qualquer
              foto — inclusive ceu claro, que e o caso mais comum aqui.
            */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 18%, rgba(0,0,0,0) 42%)`,
              }}
            />
          </>
        )}
      </div>

      {/* Campo de tinta: onde o texto vive */}
      <div
        style={{
          position: "absolute",
          top: alturaFoto,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: cores.tinta,
        }}
      />
    </AbsoluteFill>
  );
};
