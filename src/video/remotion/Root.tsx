import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";
import { duracaoEmFrames, propsExemplo, type PropsShort } from "./tipos";

/**
 * Formato do short. Os valores abaixo espelham `config.video` — se mudar la,
 * mude aqui tambem (este arquivo roda no navegador do Remotion e por isso
 * nao importa nada que dependa de Node).
 */
const LARGURA = 1080;
const ALTURA = 1920;
const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Short"
      component={Short}
      width={LARGURA}
      height={ALTURA}
      fps={FPS}
      durationInFrames={duracaoEmFrames(propsExemplo, FPS)}
      defaultProps={propsExemplo}
      // A duracao vem do numero de frases da noticia que esta sendo renderizada.
      calculateMetadata={({ props }: { props: PropsShort }) => ({
        durationInFrames: duracaoEmFrames(props, FPS),
      })}
    />
  );
};
