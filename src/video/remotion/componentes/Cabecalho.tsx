import React from "react";
import { Img, staticFile } from "remotion";
import type { Paleta } from "../tipos";

/**
 * Assinatura do perfil, presente do primeiro ao ultimo frame.
 *
 * Nao e um cartao flutuante com avatar redondo (isso e cromo de aplicativo,
 * igual em qualquer perfil): e uma marca alinhada a esquerda, no mesmo eixo
 * do texto, com uma barra pintada na cor da noticia.
 */
export const Cabecalho: React.FC<{
  logoArquivo: string | null;
  perfilNome: string;
  perfilArroba: string;
  cores: Paleta;
  destaque: string;
  pilhaFonte: string;
  margem: number;
  /** true quando o topo do frame é cor chapada clara (nenhuma foto na pasta) */
  sobreClaro: boolean;
}> = ({
  logoArquivo,
  perfilNome,
  perfilArroba,
  cores,
  destaque,
  pilhaFonte,
  margem,
  sobreClaro,
}) => {
  // Sobre ocre chapado a assinatura vira tinta; sobre foto escurecida, osso.
  const corNome = sobreClaro ? cores.tinta : cores.osso;
  const corArroba = sobreClaro ? "rgba(22,19,15,0.72)" : destaque;
  const corBarra = sobreClaro ? cores.tinta : destaque;

  return (
    <div
      style={{
        position: "absolute",
        top: 76,
        left: margem,
        right: margem,
        display: "flex",
        alignItems: "center",
        gap: 22,
      }}
    >
      {logoArquivo ? (
        <Img
          src={staticFile(logoArquivo)}
          style={{ height: 64, width: "auto", objectFit: "contain" }}
        />
      ) : (
        <div style={{ width: 12, height: 58, backgroundColor: corBarra }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: pilhaFonte,
            fontVariationSettings: '"wdth" 118, "wght" 800',
            fontSize: 34,
            lineHeight: 1,
            letterSpacing: -0.4,
            color: corNome,
            textTransform: "uppercase",
          }}
        >
          {perfilNome}
        </span>
        <span
          style={{
            fontFamily: pilhaFonte,
            fontVariationSettings: '"wdth" 78, "wght" 600',
            fontSize: 25,
            lineHeight: 1,
            letterSpacing: 3.4,
            color: corArroba,
            textTransform: "uppercase",
          }}
        >
          {perfilArroba}
        </span>
      </div>
    </div>
  );
};
