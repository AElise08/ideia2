# Demóstenes — Treinador de Oratória com IA

**Demóstenes** é um coach de oratória com IA, em português, inspirado no orador
grego que venceu uma gagueira treinando à beira-mar. Você envia um discurso (por
texto ou voz) e recebe na hora um feedback estruturado, caloroso e acionável.

É **grátis** e **sem login** — o histórico fica no seu navegador.

## O que ele faz

- **Análise com memória do coach** — clareza, persuasão, estrutura, vocabulário
  e tom, além de vícios de linguagem, sugestões de vocabulário e reescritas de
  frases. Ele lembra das suas sessões anteriores e comenta sua evolução.
- **Estrutura do discurso em 5 partes** — avalia a linha de raciocínio clássica
  da oratória: cumprimento → conquista → preparação → desenvolvimento → conclusão.
  Você vê de relance onde o discurso está forte e qual parte falta.
- **Exercícios de dicção** — trava-línguas e frases de articulação por nível
  (leve/médio/difícil). Você lê em voz alta, grava e recebe onde a fala tropeçou.
- **Jornada de evolução** — curva de notas, tendência por métrica, streak,
  antes/depois das refações e um card de treinos de dicção.
- **Modos de prática** — desafio cronometrado, prática de seção (uma das 5
  partes por vez) e exercícios de dicção.

## Modelo de IA

A análise roda no **Google Gemini 2.5 Flash Lite** (o tier mais barato que ainda
suporta áudio) via `/api/analyze` (`api/analyze.ts`) — uma serverless function
da Vercel. Pra trocar de modelo, edite a constante `MODEL` em `api/analyze.ts` e
faça re-deploy.

A chave `GEMINI_API_KEY` fica **só server-side**: o client chama `/api/analyze`,
que usa `process.env.GEMINI_API_KEY`. A chave **nunca** chega no browser nem vai
pro bundle. Obtenha a sua em [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Como rodar

**Pré-requisitos:** Node.js 22+.

```bash
npm install
cp .env.example .env.local
# edite .env.local e adicione seu GEMINI_API_KEY
npm run dev
```

> ⚠️ O `npm run dev` (Vite) serve só o front-end — ele **não** executa a pasta
> `api/`. Pra testar a análise localmente, rode com `vercel dev` (que sobe o
> front + as serverless functions). Sem isso, as chamadas a `/api/analyze` vão
> falhar.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em **Settings → Environment Variables**, adicione `GEMINI_API_KEY`
   (server-side, **sem** prefixo `VITE_`).
3. Deploy. Todo arquivo sem underscore em `api/` (`analyze`, `diag`, `ping`) é
   auto-detectado como serverless function.

## Scripts

- `npm run dev` — dev server (porta 3000)
- `npm run build` — build de produção em `dist/`
- `npm run preview` — serve a build localmente
- `npm run lint` — type-check com `tsc --noEmit`
