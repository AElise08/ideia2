import { SpeechPart } from '../types';

// Fonte de verdade das 5 PARTES do discurso (método clássico de oratória):
//   cumprimento → conquista → preparacao → desenvolvimento → conclusao.
// Definidas UMA vez aqui e reusadas em toda a UI (home, prática de seção,
// marcadores da gravação) pra não sair do lugar quando um rótulo mudar.
//   key       = chave estável (bate com o tipo SpeechPart)
//   label     = rótulo bonito exibido na tela
//   shortDesc = o que a parte faz, em 1 frase (a "linha" do bom discurso)
export interface SpeechPartInfo {
  key: SpeechPart;
  label: string;
  shortDesc: string;
}

export const SPEECH_PARTS: SpeechPartInfo[] = [
  {
    key: 'cumprimento',
    label: 'Cumprimento',
    shortDesc: 'A saudação e a apresentação: "Boa noite, eu sou...". Estabelece o primeiro contato.',
  },
  {
    key: 'conquista',
    label: 'Conquista',
    shortDesc: 'Os primeiros segundos que ganham a atenção e a simpatia: uma pergunta, uma história curta, um dado surpreendente.',
  },
  {
    key: 'preparacao',
    label: 'Preparação',
    shortDesc: 'O terreno pro assunto: contextualiza, anuncia o tema, cria expectativa.',
  },
  {
    key: 'desenvolvimento',
    label: 'Desenvolvimento',
    shortDesc: 'O coração do discurso: argumentos, exemplos e provas em sequência lógica.',
  },
  {
    key: 'conclusao',
    label: 'Conclusão',
    shortDesc: 'O fecho forte: síntese, apelo à ação ou frase de impacto. Nunca terminar seco.',
  },
];
