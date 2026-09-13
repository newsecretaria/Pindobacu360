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
import { ehClaro, marcacoes, type PropsShort } from "./tipos";

const NOME_FONTE_LOCAL = "Archivo";

/**
 * Carrega a fonte da marca de assets/fontes/. O render fica segurado ate a
 * fonte estar pronta — sem isso o primeiro frame sai na fonte do sistema.
 */
function useFonteDaMarca(arquivo: string | null): boolean {
  const [pronta, setPronta] = useState(false);
  const [espera] = useState(() => delayRender("carregando a fonte da marca"));

  useEffect(() => {
    if (!arquivo) {
      continueRender(espera);
      return;
    }
    const face = new FontFace(
      NOME_FONTE_LOCAL,
      `url(${staticFile(arquivo)}) format('woff2')`,
      // Faixas do eixo variavel: sem declarar, o Chromium trava numa
      // instancia so e a manchete perde a largura expandida.
      { weight: "400 900", stretch: "62% 125%" },
    );
    face
      .load()
      .then((carregada) => {
        document.fonts.add(carregada);
        setPronta(true);
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
  const { fps, width, height } = useVideoConfig();
  const m = marcacoes(props, fps);
  useFonteDaMarca(props.fonteArquivo);

  const frases = props.frases.length > 0 ? props.frases : [props.manchete];

  const margem = 78;
  const larguraUtil = width - margem * 2;
  const alturaFoto = Math.round(height * props.emenda);
  /** O texto comeca abaixo do bloco de categoria, que pousa na emenda. */
  const topoTexto = alturaFoto + 78;
  const alturaUtil = height - topoTexto - props.margemRodape;

  /** Campo de texto: tudo acontece no mesmo lugar, so o conteudo troca. */
  const campo: React.CSSProperties = {
    position: "absolute",
    left: margem,
    right: margem,
    top: topoTexto,
    height: alturaUtil,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  };

  return (
    <AbsoluteFill>
      <Fundo
        arquivo={props.fundoArquivo}
        cores={props.cores}
        destaque={props.destaque}
        emenda={props.emenda}
      />

      <Cabecalho
        logoArquivo={props.logoArquivo}
        perfilNome={props.perfilNome}
        perfilArroba={props.perfilArroba}
        cores={props.cores}
        destaque={props.destaque}
        pilhaFonte={props.pilhaFonte}
        margem={margem}
        sobreClaro={props.fundoArquivo === null && ehClaro(props.destaque)}
      />

      {/* A assinatura: o bloco pousado na emenda, atravessando as duas faixas */}
      <div
        style={{
          position: "absolute",
          left: margem,
          top: alturaFoto,
          transform: "translateY(-50%)",
          display: "flex",
        }}
      >
        <FaixaCategoria
          categoria={props.categoria}
          cores={props.cores}
          destaque={props.destaque}
          pilhaFonte={props.pilhaFonte}
          atraso={6}
        />
      </div>

      <Sequence from={m.manchete} durationInFrames={m.duracaoManchete}>
        <div style={campo}>
          <Manchete
            texto={props.manchete}
            cores={props.cores}
            pilhaFonte={props.pilhaFonte}
            larguraUtil={larguraUtil}
            alturaUtil={alturaUtil}
          />
        </div>
      </Sequence>

      {frases.map((frase, i) => (
        <Sequence
          key={i}
          from={m.primeiraFrase + i * m.duracaoFrase}
          durationInFrames={m.duracaoFrase}
        >
          <div style={campo}>
            <TelaFrase
              texto={frase}
              indice={i}
              total={frases.length}
              duracao={m.duracaoFrase}
              cores={props.cores}
              destaque={props.destaque}
              pilhaFonte={props.pilhaFonte}
              larguraUtil={larguraUtil}
              alturaUtil={alturaUtil - 60}
            />
          </div>
        </Sequence>
      ))}

      <Sequence from={m.fechamento} durationInFrames={m.duracaoFechamento}>
        <div style={campo}>
          <Fechamento
            fonte={props.fonte}
            perfilArroba={props.perfilArroba}
            cores={props.cores}
            destaque={props.destaque}
            pilhaFonte={props.pilhaFonte}
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
