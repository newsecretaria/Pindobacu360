import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Cabecalho } from "./componentes/Cabecalho";
import { FaixaCategoria } from "./componentes/FaixaCategoria";
import { Fechamento } from "./componentes/Fechamento";
import { Fundo } from "./componentes/Fundo";
import { Manchete } from "./componentes/Manchete";
import { TelaFrase } from "./componentes/TelaFrase";
import { marcacoes, type PropsShort } from "./tipos";

const NOME_FONTE_LOCAL = "MarcaPindobacu";

/** Carrega a fonte da marca de assets/fontes/, se o Ricardo tiver colocado uma. */
function useFonteDaMarca(arquivo: string | null): string | null {
  const [pronta, setPronta] = useState<string | null>(null);
  const [espera] = useState(() => delayRender("carregando fonte da marca"));

  useEffect(() => {
    if (!arquivo) {
      continueRender(espera);
      return;
    }
    const face = new FontFace(
      NOME_FONTE_LOCAL,
      `url(${staticFile(arquivo)})`,
    );
    face
      .load()
      .then((carregada) => {
        document.fonts.add(carregada);
        setPronta(NOME_FONTE_LOCAL);
        continueRender(espera);
      })
      .catch((erro) => {
        console.warn(`Nao consegui carregar a fonte ${arquivo}: ${String(erro)}`);
        continueRender(espera);
      });
  }, [arquivo, espera]);

  return pronta;
}

export const Short: React.FC<PropsShort> = (props) => {
  const { fps } = useVideoConfig();
  const m = marcacoes(props, fps);
  const fonteLocal = useFonteDaMarca(props.fonteArquivo);
  const pilhaFonte = fonteLocal
    ? `"${fonteLocal}", ${props.pilhaFonte}`
    : props.pilhaFonte;

  const frases = props.frases.length > 0 ? props.frases : [props.manchete];

  /** Area util: nada importante nas margens seguras do Instagram. */
  const areaConteudo: React.CSSProperties = {
    position: "absolute",
    left: 80,
    right: 80,
    top: props.margemTopo + 40,
    bottom: props.margemRodape,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 40,
  };

  return (
    <AbsoluteFill>
      <Fundo arquivo={props.fundoArquivo} cores={props.cores} />

      <Cabecalho
        logoArquivo={props.logoArquivo}
        perfilNome={props.perfilNome}
        perfilArroba={props.perfilArroba}
        cores={props.cores}
        pilhaFonte={pilhaFonte}
      />

      {/* Abertura + manchete dividem a mesma area, a faixa continua durante a manchete */}
      <Sequence from={m.abertura} durationInFrames={m.primeiraFrase}>
        <div style={areaConteudo}>
          <FaixaCategoria
            categoria={props.categoria}
            cores={props.cores}
            pilhaFonte={pilhaFonte}
          />
          {/* layout="none": um Sequence aninhado normalmente vira um div
              absolutamente posicionado, o que tiraria a manchete do fluxo
              flex e a jogaria por cima da faixa de categoria. */}
          <Sequence from={m.manchete} layout="none">
            <Manchete
              texto={props.manchete}
              cores={props.cores}
              pilhaFonte={pilhaFonte}
            />
          </Sequence>
        </div>
      </Sequence>

      {frases.map((frase, i) => (
        <Sequence
          key={i}
          from={m.primeiraFrase + i * m.duracaoFrase}
          durationInFrames={m.duracaoFrase}
        >
          <div style={areaConteudo}>
            <TelaFrase
              texto={frase}
              indice={i}
              total={frases.length}
              duracao={m.duracaoFrase}
              cores={props.cores}
              pilhaFonte={pilhaFonte}
            />
          </div>
        </Sequence>
      ))}

      <Sequence
        from={m.fechamento}
        durationInFrames={m.duracaoFechamento}
      >
        <div style={areaConteudo}>
          <Fechamento
            fonte={props.fonte}
            perfilArroba={props.perfilArroba}
            cores={props.cores}
            pilhaFonte={pilhaFonte}
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
