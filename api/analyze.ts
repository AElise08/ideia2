import type { VercelRequest, VercelResponse } from '@vercel/node';

// Gemini via a Interactions API (GA em 2026): endpoint único
// `/v1beta/interactions`, body { model, input, generation_config }, auth pelo
// header `x-goog-api-key`. Verificado contra a doc oficial e a API ao vivo.
//
// Modelo: gemini-2.5-flash-lite — o mais barato da família (2026-07-03:
// $0.10/1M in texto, $0.30/1M in áudio, $0.40/1M out) E com suporte a ÁUDIO.
// O antigo gemini-3.5-flash era ~22x mais caro na saída e, segundo a doc, NÃO
// aceitava áudio (o recurso de voz do app). Se a qualidade do coach cair, subir
// aqui é troca de 1 linha: 'gemini-3.1-flash-lite' ($0.25/$1.50) ou
// 'gemini-2.5-flash' ($0.30/$2.50) — ambos ainda bem mais baratos que o 3.5.
const MODEL = 'gemini-2.5-flash-lite';
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

// ----------------------------------------------------------------
// Helpers INLINE (antes vinham de ./geminiCore). No runtime ESM da Vercel
// ("type":"module"), o import relativo `./geminiCore` falhava ao carregar a
// função → FUNCTION_INVOCATION_FAILED (500 texto puro, antes do try/catch).
// Manter tudo self-contained, como api/ping.ts e api/diag.ts, evita isso.
// ----------------------------------------------------------------
// Contexto compacto de MEMÓRIA (Fase 2, §4.2). Definido inline pra manter o
// serverless self-contained (ver comentário acima sobre o ESM da Vercel).
interface AnalyzeContext {
  nickname?: string;
  sessionCount?: number;
  focusArea?: string;
  lastCoachNote?: string;
  recentScores?: number[];
  recurringImprovements?: string[];
  isRetry?: boolean;
}

type SpeechPart = 'cumprimento' | 'conquista' | 'preparacao' | 'desenvolvimento' | 'conclusao';

interface AnalyzeInput {
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  markers?: { label: string; timestamp: number }[];
  isProfessorMode?: boolean;
  context?: AnalyzeContext;
  // Prática de SEÇÃO: qual das 5 partes este trecho é (avalia COMO aquela parte).
  sectionPart?: SpeechPart;
  // Treino de DICÇÃO: texto-alvo do exercício (o modelo compara o áudio lido com ele).
  dictionTarget?: string;
}

// As 5 PARTES da linha de raciocínio de um bom discurso (método clássico de
// oratória). Definidas uma vez só e reaproveitadas pelo modo discurso e pelo
// modo seção, pra o coach avaliar sempre com o mesmo critério.
const SPEECH_PARTS_GUIDE: string = [
  'As 5 PARTES da linha de raciocínio de um bom discurso (nesta ordem):',
  '1. cumprimento — saudação e apresentação; estabelece contato com a plateia ("Boa noite, eu sou...").',
  '2. conquista — conquistar a atenção e a simpatia da plateia logo no início: uma história curta, uma pergunta instigante, um dado surpreendente ou um elogio sincero.',
  '3. preparacao — preparar o terreno: contextualizar, anunciar o tema e criar expectativa para o assunto central.',
  '4. desenvolvimento — o assunto central: argumentos, exemplos e provas, em sequência lógica.',
  '5. conclusao — fecho forte: síntese, apelo à ação ou frase de impacto; nunca terminar seco.',
].join('\n');

// Rótulo humano (PT-BR, com acento) de cada uma das 5 partes, pra falar delas
// com naturalidade no prompt do modo seção.
const PART_LABELS_PT: Record<SpeechPart, string> = {
  cumprimento: 'cumprimento',
  conquista: 'conquista da plateia',
  preparacao: 'preparação',
  desenvolvimento: 'desenvolvimento',
  conclusao: 'conclusão',
};

// Rótulos PT-BR das métricas, pra o coach falar do foco de forma humana no prompt.
const FOCUS_LABELS_PT: Record<string, string> = {
  clarity: 'clareza',
  persuasion: 'persuasão',
  structure: 'estrutura',
  vocabulary: 'vocabulário',
  tone: 'tom',
};

// Monta o bloco de MEMÓRIA do prompt a partir do context. Só resumo — nunca
// transcrições antigas. Retorna [] quando não há context (back-compat total).
const buildContextLines = (ctx?: AnalyzeContext): string[] => {
  if (!ctx) return [];
  const lines: string[] = [
    '',
    '--- MEMÓRIA (esta pessoa JÁ treinou com você antes) ---',
    'IMPORTANTE: esta NÃO é a primeira vez dela. Comece reconhecendo a volta dela com carinho ("bom te ver de novo") ANTES de qualquer crítica, de forma natural e breve — sem soar robótico.',
  ];
  if (ctx.nickname) lines.push(`- O nome/apelido dela é "${ctx.nickname}" — use-o com naturalidade.`);
  if (typeof ctx.sessionCount === 'number' && ctx.sessionCount > 0) {
    lines.push(`- Ela já fez ${ctx.sessionCount} análise(s) aqui. Reconheça a constância.`);
  }
  if (ctx.focusArea) {
    const fa = FOCUS_LABELS_PT[ctx.focusArea] || ctx.focusArea;
    lines.push(`- O foco combinado na última vez era "${fa}". Repare se ela evoluiu justo nesse ponto e comente.`);
  }
  if (ctx.lastCoachNote) {
    lines.push(`- Da última vez você deixou este bilhete pra ela: "${ctx.lastCoachNote}". Faça um gancho de continuidade com ele, se fizer sentido.`);
  }
  if (ctx.recentScores && ctx.recentScores.length > 0) {
    lines.push(`- Notas gerais recentes (da mais antiga pra mais nova): ${ctx.recentScores.join(', ')}. Olhe a TENDÊNCIA (subindo, estável ou caindo) e comente com honestidade gentil.`);
  }
  if (ctx.recurringImprovements && ctx.recurringImprovements.length > 0) {
    lines.push(`- Pontos que costumam se repetir nas melhorias dela: ${ctx.recurringImprovements.join('; ')}. Se um deles reaparecer, aponte com paciência; se sumiu, comemore.`);
  }
  if (ctx.isRetry) {
    lines.push('- Esta é uma REFAÇÃO: ela está refazendo um discurso aplicando suas sugestões. Compare o antes/depois com carinho e COMEMORE qualquer avanço concreto.');
  }
  lines.push('- AGORA preencha o campo "progressComment" (1 frase curta e calorosa) comentando/comemorando a evolução ou a volta dela — ex.: "Seu ritmo melhorou desde a última vez 🎉". Só faça isso porque há memória; seja específico à tendência acima.');
  lines.push('--- fim da memória ---');
  return lines;
};

// A persona do coach — o "Demóstenes", calorosa e encorajadora. Compartilhada
// pelos três modos (discurso, seção, dicção).
const PERSONA_LINES: string[] = [
  'Você é o Demóstenes: um coach de oratória caloroso, encorajador e paciente, inspirado no orador grego que venceu uma gagueira treinando à beira-mar. Por isso você acredita que TODO MUNDO evolui com prática, e trata cada pessoa com respeito e gentileza, seja iniciante ou avançado.',
  'Fale como um mentor humano falaria com um amigo: acessível, positivo e específico. Comece sempre reconhecendo o esforço e o que já está bom. Nada de tom acadêmico, arrogante ou julgador — a pessoa precisa sair MOTIVADA a praticar de novo, nunca envergonhada.',
  'Linguagem simples e cotidiana. Evite jargão técnico e palavras difíceis; se precisar citar um conceito, explique em uma frase fácil. Trate a pessoa por "você" e use um tom próximo e amigável.',
];

// MODO DICÇÃO: a pessoa gravou a si mesma lendo em voz alta um texto-alvo
// (trava-língua/frase). O coach conhece o alvo, "transcreve" o áudio e compara.
const buildDictionPrompt = (input: AnalyzeInput): string => {
  return [
    ...PERSONA_LINES,
    '',
    'MODO DICÇÃO: a pessoa gravou a si mesma LENDO em voz alta o TEXTO-ALVO que está no fim deste prompt (um trava-língua ou frase de articulação). Seu trabalho é avaliar a DICÇÃO dela — o quão nítida saiu a articulação.',
    '- Você CONHECE o texto-alvo exato. TRANSCREVA mentalmente o que a pessoa realmente falou no áudio e COMPARE com o alvo, palavra por palavra.',
    '- Avalie articulação/pronúncia (quais palavras ou sons saíram engolidos, trocados ou atropelados), o ritmo (correu demais? atropelou as sílabas?) e a clareza geral.',
    '- Dicção é músculo destreinado, não falta de dom nem sotaque "feio". Comemore o que saiu limpo e aponte com carinho, sem bronca, o que treinar.',
    '',
    'Devolva SOMENTE um objeto JSON válido (sem texto em volta, sem ```), em português do Brasil, com EXATAMENTE estas chaves:',
    '- overallScore: inteiro de 0 a 100 — o quão nítida e no ritmo saiu a leitura em comparação com o alvo.',
    '- feedback: string de 2 a 4 frases, calorosa e específica — comece pelo que saiu bem e depois aponte com gentileza o principal som a treinar.',
    '- strengths: array de 2-4 strings — o que a articulação dela já faz bem.',
    '- improvements: array de 2-4 strings — sugestões práticas e amigáveis pra articular melhor.',
    '- rhetoricalDevices: array VAZIO [] (não se aplica à dicção).',
    '- dictionAnalysis: objeto { clarity, pacing, troubleSounds }:',
    '    • clarity: 1 frase sobre a nitidez da articulação;',
    '    • pacing: 1 frase sobre o ritmo (se correu/atropelou ou ficou no ponto);',
    '    • troubleSounds: array de 0 a 5 objetos { sound, words, tip } — sound = o som/consoante que saiu engolido, trocado ou atropelado (ex.: "R vibrado", "S no fim", "TR"); words = array das palavras onde tropeçou (ex.: ["pratos","trigo"]); tip = 1 dica curta, prática e gentil pra treinar esse som. Deixe [] se a leitura saiu limpa — NUNCA invente tropeço.',
    'NÃO inclua "metrics" nem "structureAnalysis" neste modo — eles não se aplicam à dicção.',
    '',
    'Texto-alvo que a pessoa deveria ler em voz alta:',
    input.dictionTarget || '',
  ].filter(Boolean).join('\n');
};

const buildPrompt = (input: AnalyzeInput): string => {
  // Modo dicção tem prompt próprio (compara áudio lido com o texto-alvo).
  if (input.dictionTarget) return buildDictionPrompt(input);

  const isAudio = !!input.audioBase64;
  const isProfessor = !!input.isProfessorMode;
  const hasMarkers = !!(input.markers && input.markers.length > 0);
  // Modo SEÇÃO: a pessoa escolheu UMA das 5 partes e colou só aquele trecho.
  // Aí a análise foca em avaliar o trecho COMO aquela parte (não pede a
  // estrutura completa em 5 partes — só existe uma).
  const isSection = !!input.sectionPart;
  const sectionLabel = input.sectionPart ? PART_LABELS_PT[input.sectionPart] : '';
  return [
    ...PERSONA_LINES,
    isProfessor
      ? 'MODO PROFESSOR: a pessoa PEDIU explicações mais aprofundadas. Aí sim pode nomear conceitos de retórica (ethos = credibilidade, pathos = emoção, logos = lógica; figuras de linguagem) — mas sempre traduzindo o termo em palavras simples logo em seguida, como um bom professor que não quer intimidar ninguém.'
      : 'MODO PADRÃO: nada de termos técnicos de retórica. Fale de forma direta e prática, como uma conversa.',
    // Modo seção: contextualiza que o trecho é UMA parte específica do discurso.
    isSection
      ? [
          '',
          `MODO SEÇÃO: o trecho abaixo é a parte "${sectionLabel}" de um discurso — a pessoa quer treinar SÓ essa parte. Avalie o trecho COMO essa parte: o que ela precisa alcançar, se alcançou e como deixá-la mais forte.`,
          SPEECH_PARTS_GUIDE,
          `Concentre TODA a análise na parte "${sectionLabel}": não cobre as outras partes (elas não estão neste trecho). A métrica "structure" deve refletir o quão bem este trecho cumpre o papel dessa parte.`,
        ].join('\n')
      : '',
    '',
    'Como avaliar (com carinho e honestidade ao mesmo tempo):',
    '- Baseie cada comentário no que a pessoa REALMENTE disse (cite ou parafraseie o trecho). Evite frases genéricas que serviriam para qualquer discurso.',
    '- As notas servem para orientar, não para julgar. Use esta régua, sempre olhando o potencial: 85-100 = muito bom, 70-84 = bom com pontos a lapidar, 55-69 = base boa, precisa de treino, abaixo de 55 = começo promissor, vamos construir juntos. Seja realista, mas enxergue o copo meio cheio.',
    '- Enquadre TODA crítica como um convite para melhorar ("que tal experimentar...", "uma ideia é...", "ficaria ainda mais forte se..."), nunca como um defeito da pessoa.',
    '- LIDERE PELA FRAQUEZA, não só pelo elogio: antes de tudo, identifique com clareza O ÚNICO ponto mais fraco a corrigir PRIMEIRO — o que mais está segurando a pessoa agora — e diga, em linguagem simples e acolhedora, EXATAMENTE como consertar (o próximo ganho concreto). Esse ponto é o coração da análise; os elogios continuam, mas a fraqueza-chave precisa ficar óbvia. Seja ESPECÍFICO ao que a pessoa realmente disse — nada de conselhos genéricos que serviriam pra qualquer discurso.',
    isAudio
      ? '- Isto é um ÁUDIO: primeiro TRANSCREVA mentalmente o que foi dito e analise as PALAVRAS FALADAS (vocabulário, frases, muletas) como se fosse texto — e comente também a ENTREGA (ritmo, pausas, entonação, energia) de forma acolhedora. As duas coisas, não só a entrega.'
      : '- Isto é um TEXTO: olhe a escrita, a clareza das frases e a gramática, sempre de forma construtiva.',
    '- Fique de olho nas MULETAS/vícios de linguagem ("né", "tipo", "aí", "então", "assim", "ok", "hã/é...", palavras repetidas demais). No áudio elas escapam ainda mais — conte quantas vezes aparecem quando der.',
    '',
    'Devolva SOMENTE um objeto JSON válido (sem texto em volta, sem ```), em português do Brasil, com EXATAMENTE estas chaves:',
    '- overallScore: inteiro de 0 a 100 (nota geral, coerente com as métricas).',
    '- metrics: objeto { clarity, persuasion, structure, vocabulary, tone } — cada um INTEIRO de 0 a 100.',
    '- feedback: string de 3 a 5 frases, calorosa e específica a este discurso. Comece com um reconhecimento sincero, depois aponte com gentileza o principal caminho de evolução e termine com incentivo.',
    '- strengths: array de 3-5 strings — o que a pessoa já faz bem (seja generoso e concreto, sempre há algo a elogiar).',
    '- improvements: array de 3-5 strings — sugestões práticas e amigáveis de como melhorar (sempre no espírito "experimente...", com um exemplo quando possível).',
    '- rhetoricalDevices: array de strings — recursos de persuasão que a pessoa usou, em linguagem simples (ex.: "repetição para dar ênfase", "pergunta que faz o público pensar", "comparação/metáfora", "apelo à emoção"). Vazio se não houver.',
    // audioAnalysis é exclusivo do áudio (entrega: ritmo/pausas/entonação)…
    isAudio
      ? '- audioAnalysis: objeto { pacing, pauseUsage, intonation } — cada um uma frase gentil em PT-BR sobre ritmo, uso de pausas e variação de entonação.'
      : '',
    // …mas vocabularySuggestions, phrasingFixes e speechCrutches valem pros DOIS
    // modos: no áudio, o modelo transcreve a fala e sugere em cima do que foi DITO
    // (é falando que a pessoa solta mais muleta — diferencial do produto).
    isAudio
      ? '- vocabularySuggestions: array de 2-4 objetos { original, suggestion, reason } — com base nas PALAVRAS FALADAS no áudio (cite exatamente como a pessoa disse em "original"), sugira palavras/expressões mais fortes ou variadas, explicando o ganho de um jeito leve. Vazio [] se já estiver ótimo.'
      : '- vocabularySuggestions: array de 2-4 objetos { original, suggestion, reason } — sugira palavras/expressões mais fortes ou variadas no lugar de outras, explicando o ganho de um jeito leve. Vazio se já estiver ótimo.',
    isAudio
      ? '- phrasingFixes: array de 0 a 5 objetos { original, correction, reason } — pegue FRASES FALADAS no áudio que saíram confusas, mal construídas ou com erros de concordância (transcreva o trecho em "original") e ofereça uma REESCRITA mais clara e natural, que a pessoa possa falar da próxima vez. No "reason", explique a melhora com gentileza e sem tom de correção de prova. Deixe vazio [] se a fala já estiver clara — nunca invente erro.'
      : '- phrasingFixes: array de 0 a 5 objetos { original, correction, reason } — pegue frases mal construídas, confusas ou com erros de gramática/ortografia/concordância e ofereça uma REESCRITA mais clara e natural. No "reason", explique a melhora com gentileza e sem tom de correção de prova (ex.: "fica mais fluido assim" em vez de "está errado"). Deixe vazio [] se a escrita já estiver clara e correta — nunca invente erro.',
    '- speechCrutches: array de 0 a 6 objetos { term, count, tip } — as MULETAS/vícios de linguagem que a pessoa realmente usou ("né", "tipo", "aí", "então", "assim", "ok", "hã/é...", palavras ou expressões repetidas em excesso). term = a muleta exatamente como apareceu; count = número INTEIRO aproximado de vezes que apareceu (omita o campo se não der pra estimar); tip = 1 dica curta, prática e gentil pra cortar essa muleta (ex.: "troque o \'né\' por uma pausa curta — silêncio também é ênfase"). Deixe vazio [] se não houver — nunca invente muleta.',
    hasMarkers
      ? `- sectionAnalysis: array de { sectionName, feedback, score (0-100) } — um item por seção marcada: ${input.markers!.map(m => m.label).join(', ')}.`
      : '',
    // structureAnalysis: a ESTRUTURA em 5 PARTES — obrigatória no modo discurso
    // (texto ou áudio completo), NÃO no modo seção (que só tem uma parte).
    !isSection
      ? [
          '- structureAnalysis: array com EXATAMENTE 5 objetos { part, present, score, feedback, suggestion } — um por parte, NESTA ORDEM: cumprimento, conquista, preparacao, desenvolvimento, conclusao. Onde:',
          '    • part: exatamente "cumprimento" | "conquista" | "preparacao" | "desenvolvimento" | "conclusao";',
          '    • present: true se a parte aparece no discurso, false se está faltando;',
          '    • score: inteiro de 0 a 100 (0 quando a parte está ausente);',
          '    • feedback: 1-2 frases específicas ao que a pessoa REALMENTE disse nessa parte (não genérico);',
          '    • suggestion: 1 frase prática de como criar ou melhorar essa parte — se present=false, ensine COM CARINHO como adicioná-la, sem bronca.',
          SPEECH_PARTS_GUIDE,
          'A métrica "structure" (em metrics) DEVE ser coerente com esta avaliação em 5 partes: quanto mais partes bem executadas e na ordem certa, maior a nota de structure.',
        ].join('\n')
      : '',
    '',
    // --- Fecha o loop + LIDERA PELA FRAQUEZA: a análise nunca termina num beco',
    // sem saída E deixa gritante o ponto fraco a destravar primeiro (topFix/focusArea).
    'E MAIS ESTES CINCO campos (OBRIGATÓRIOS — sempre preenchidos, específicos a este discurso, nunca genéricos):',
    '- topFix: string curta (1 frase) — O PONTO MAIS IMPORTANTE de toda a análise. Diga, de forma direta e acolhedora, O ÚNICO ponto mais fraco que está segurando a pessoa AGORA e COMO consertá-lo (o próximo ganho concreto). Formato: "{o que está pegando} → {o conserto acionável}". Ligue ao focusArea. Ex.: "Suas ideias boas se perdem sem uma linha de fecho → termine cada trecho com uma frase curta que crave o ponto." NUNCA deixe vazio e NUNCA seja genérico.',
    '- nextStep: string curta (1 frase) — o próximo passo prático e concreto pra ela treinar AGORA, no espírito "experimente...", coerente com o topFix. Ex.: "Refaça este trecho em áudio, fazendo uma pausa curta depois de cada ideia forte."',
    '- coachNote: string curta e calorosa (1-2 frases) — um bilhete pessoal, como um treinador que acredita nela, pra ela guardar e lembrar na próxima vez. Motivador, específico ao que ela fez hoje, nunca genérico.',
    '- focusArea: EXATAMENTE uma destas palavras (a métrica mais fraca, a que o topFix ataca, a lapidar primeiro): "clarity", "persuasion", "structure", "vocabulary" ou "tone". SEMPRE preenchido, coerente com a menor nota em metrics.',
    '- suggestedMission: string curta — uma missão de treino divertida e concreta pra próxima vez, ligada ao focusArea. Ex.: "Grave 60 segundos sobre um tema livre sem usar \'tipo\' e \'né\'."',
    input.context
      ? '- progressComment: string curta (1 frase) — só porque há MEMÓRIA (veja o bloco abaixo): comente/comemore a evolução ou a volta da pessoa. Coerente com a tendência das notas. Ex.: "Seu ritmo melhorou desde a última vez 🎉".'
      : '',
    ...buildContextLines(input.context),
    '',
    isSection
      ? `Trecho a analisar (parte "${sectionLabel}"):`
      : 'Discurso a analisar:',
    input.text ? input.text : '[conteúdo no áudio anexado]',
  ].filter(Boolean).join('\n');
};

const cleanBase64 = (b64: string): string =>
  b64.replace(/^data:[^;]+;base64,/, '');

// A Interactions API às vezes devolve o corpo embrulhado num array: [{ ... }].
// Isto normaliza pra sempre trabalharmos com um objeto.
const unwrap = (data: any): any => (Array.isArray(data) ? data[0] : data);

// O Gemini às vezes devolve o JSON dentro de ```json ... ``` ou com texto em
// volta. Isto extrai o primeiro objeto/array JSON de forma tolerante.
const extractJson = (raw: string): any => {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('resposta não é JSON');
  }
};

// ----------------------------------------------------------------
// Server-side: a chave GEMINI_API_KEY NUNCA sai daqui pro client. A rota é
// ABERTA (Demóstenes gratuito) — sem login, sem cobrança, sem gate de crédito.
// ----------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY não configurada no servidor. Adicione em Vercel → Settings → Environment Variables (sem prefixo VITE_) e faça um novo deploy.',
    });
  }

  // A Vercel já faz parse de JSON quando Content-Type: application/json. Mas se
  // vier como string (edge case), fazemos o parse defensivo.
  let body: {
    text?: string;
    audioBase64?: string;
    mimeType?: string;
    isProfessorMode?: boolean;
    markers?: { label: string; timestamp: number }[];
    context?: AnalyzeContext;
    sectionPart?: SpeechPart;
    dictionTarget?: string;
  };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Body inválido: envie JSON válido.' });
  }
  if (!body.text && !body.audioBase64) {
    return res.status(400).json({ error: 'Forneça `text` ou `audioBase64` no body.' });
  }

  try {
    // Prompt: PT-BR. buildPrompt escolhe o modo (discurso, seção ou dicção)
    // pelos campos do body.
    const promptText = buildPrompt({
      text: body.text,
      audioBase64: body.audioBase64,
      mimeType: body.mimeType,
      isProfessorMode: body.isProfessorMode,
      markers: body.markers,
      context: body.context,
      sectionPart: body.sectionPart,
      dictionTarget: body.dictionTarget,
    });

    // `input` pode ser string (só texto) ou lista de parts. Áudio inline na
    // Interactions API é um part FLAT: { type: 'audio', data, mime_type }.
    // O Gemini aceita mp3/wav/ogg/flac/aiff/aac — NÃO aceita webm, por isso o
    // client converte a gravação pra audio/wav antes de enviar.
    const inputParts: any[] = [{ type: 'text', text: promptText }];
    if (body.audioBase64) {
      inputParts.push({
        type: 'audio',
        data: cleanBase64(body.audioBase64),
        mime_type: body.mimeType || 'audio/wav',
      });
    }

    // generation_config mínimo e verificado (temperature). Não enviamos
    // response_mime_type: não é suportado pela Interactions API e derruba a
    // request com 400. O formato JSON é pedido no próprio prompt e o parser
    // abaixo é tolerante a cercas de código.
    const requestBody = {
      model: MODEL,
      input: body.audioBase64 ? inputParts : promptText,
      generation_config: {
        temperature: 0.7,
      },
    };

    const r = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await r.text();

    if (!r.ok) {
      let friendly = `Erro do Gemini (${r.status})`;
      try {
        // Erros vêm como { error: {...} } OU embrulhados em [{ error: {...} }].
        const j = unwrap(JSON.parse(rawText));
        friendly = j?.error?.message || j?.message || friendly;
      } catch {
        if (rawText && rawText.length < 300) friendly = rawText;
      }
      console.error('[api/analyze] Gemini error:', r.status, friendly, '| raw:', rawText.slice(0, 500));
      // Repassa o status real do Google (401/403/404/429...) pra ficar óbvio.
      return res.status(r.status === 500 ? 502 : r.status).json({ error: friendly });
    }

    // Resposta OK: { id, status, output_text?, steps: [...] } (possivelmente em array).
    const data: any = unwrap(JSON.parse(rawText));
    let text: string | undefined = data?.output_text;
    if (!text && Array.isArray(data?.steps)) {
      for (const step of data.steps) {
        const parts = step?.content || step?.output;
        if (Array.isArray(parts)) {
          text = parts
            .filter((p: any) => p?.type === 'text' || p?.text)
            .map((p: any) => p?.text || p?.content || '')
            .join('');
          if (text) break;
        }
      }
    }
    if (!text) {
      console.error('[api/analyze] Gemini sem texto. data:', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'Nenhuma análise retornada pelo Gemini.' });
    }

    let parsed: any;
    try {
      parsed = extractJson(text);
    } catch {
      console.error('[api/analyze] JSON inválido do Gemini:', text.slice(0, 500));
      return res.status(502).json({ error: 'Gemini retornou texto que não é JSON válido.' });
    }
    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[api/analyze] FULL:', JSON.stringify({
      name: err?.name,
      message: err?.message,
      code: err?.code || err?.status,
      stack: (err?.stack || '').split('\n').slice(0, 8).join('\n'),
    }, null, 2));
    return res.status(502).json({ error: err?.message || 'Erro desconhecido ao chamar o Gemini.' });
  }
}
