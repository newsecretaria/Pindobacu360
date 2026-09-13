import React from "react";
import { Img, staticFile } from "remotion";
import type { PropsShort } from "../tipos";

/**
 * Cabecalho fixo do perfil, presente do primeiro ao ultimo frame.
 * Fica dentro da margem segura do topo.
 */
export const Cabecalho: React.FC<{
  logoArquivo: string | null;
  perfilNome: string;
  perfilArroba: string;
  cores: PropsShort["cores"];
  pilhaFonte: string;
}> = ({ logoArquivo, perfilNome, perfilArroba, cores, pilhaFonte }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 56,
        right: 56,
        height: 110,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 28px",
        borderRadius: 24,
        backgroundColor: "rgba(0,0,0,0.42)",
        border: `3px solid ${cores.primaria}`,
      }}
    >
      {logoArquivo ? (
        <Img
          src={staticFile(logoArquivo)}
          style={{ width: 76, height: 76, objectFit: "contain" }}
        />
      ) : (
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: cores.primaria,
            color: cores.texto,
            fontFamily: pilhaFonte,
            fontWeight: 900,
            fontSize: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          P
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: pilhaFonte,
            fontWeight: 900,
            fontSize: 36,
            color: cores.texto,
            letterSpacing: -0.5,
          }}
        >
          {perfilNome}
        </span>
        <span
          style={{
            fontFamily: pilhaFonte,
            fontWeight: 700,
            fontSize: 28,
            color: cores.destaque,
          }}
        >
          {perfilArroba}
        </span>
      </div>
    </div>
  );
};
