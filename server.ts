import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function cleanJsonText(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatFriendlyGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();
  if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid')) {
    return {
      status: 403,
      message: 'Chave da API Gemini inválida ou sem permissão. Verifique Settings > Secrets.',
    };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted')) {
    return {
      status: 429,
      message: 'Limite momentâneo de requisições da IA atingido. Aguarde alguns segundos e tente novamente.',
    };
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    return {
      status: 503,
      message: 'Os servidores da IA estão com alta demanda no momento. Tente novamente em instantes.',
    };
  }
  return {
    status: 500,
    message: 'Não foi possível obter resposta da IA agora. Tente novamente.',
  };
}

async function generateStructuredJson<T>(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseSchema: Record<string, unknown>;
  },
): Promise<T> {
  const attempts: Array<{
    model: string;
    thinkingLevel: ThinkingLevel;
    timeoutMs: number;
    delayBeforeMs: number;
  }> = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 12000, delayBeforeMs: 0 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 12000, delayBeforeMs: 300 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 15000, delayBeforeMs: 400 },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    if (attempt.delayBeforeMs > 0) {
      await sleep(attempt.delayBeforeMs);
    }
    try {
      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
          abortSignal: AbortSignal.timeout(attempt.timeoutMs),
        },
      });
      const jsonStr = cleanJsonText(response.text);
      if (!jsonStr) {
        throw new Error('Resposta vazia do modelo');
      }
      return JSON.parse(jsonStr) as T;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err ?? '');
      console.error(`[Gemini attempt failed: ${attempt.model}]`, msg);
      // Do not retry non-transient auth/key errors
      const lower = msg.toLowerCase();
      if (lower.includes('permission_denied') || lower.includes('api_key_invalid')) {
        throw err;
      }
    }
  }

  throw lastError;
}

app.post('/api/press/interview', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
      return;
    }

    const {
      managerName,
      clubName,
      leagueName,
      opponentName,
      userGoals,
      opponentGoals,
      wasHome,
      rank,
      boardConfidence,
      competitionLabel,
    } = req.body as {
      managerName: string;
      clubName: string;
      leagueName: string;
      opponentName: string;
      userGoals: number;
      opponentGoals: number;
      wasHome: boolean;
      rank: number;
      boardConfidence: number;
      competitionLabel?: string;
    };

    const prompt = `Você é um jornalista esportivo brasileiro cobrindo a coletiva pós-jogo.
Contexto:
- Técnico(a): ${managerName}
- Clube: ${clubName} (${leagueName})
- Competição: ${competitionLabel || leagueName}
- Adversário: ${opponentName}
- Placar do clube do usuário: ${userGoals} x ${opponentGoals} (${wasHome ? 'em casa' : 'fora de casa'})
- Posição na tabela: ${rank}º lugar
- Confiança da diretoria: ${boardConfidence}%

Crie UMA pergunta direta e realista de coletiva pós-jogo em português do Brasil, e EXATAMENTE 3 opções de resposta distintas para o treinador escolher (uma exaltando/protegendo o elenco, uma firme/tática agradando a diretoria, e uma equilibrada/provocativa ou focada no próximo desafio).`;

    const parsed = await generateStructuredJson<Record<string, unknown>>(ai, {
      contents: prompt,
      systemInstruction:
        'Responda exclusivamente em JSON válido seguindo o schema solicitado, com português brasileiro natural do jornalismo esportivo.',
      responseSchema: {
        type: Type.OBJECT,
        required: ['reporterName', 'outlet', 'question', 'options'],
        properties: {
          reporterName: { type: Type.STRING },
          outlet: { type: Type.STRING },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['label', 'quote', 'moraleDelta', 'confidenceDelta', 'effectHint'],
              properties: {
                label: { type: Type.STRING },
                quote: { type: Type.STRING },
                moraleDelta: { type: Type.INTEGER },
                confidenceDelta: { type: Type.INTEGER },
                effectHint: { type: Type.STRING },
              },
            },
          },
        },
      },
    });

    res.json(parsed);
  } catch (err) {
    const friendly = formatFriendlyGeminiError(err);
    res.status(friendly.status).json({ error: friendly.message });
  }
});

app.post('/api/press/social', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
      return;
    }

    const { clubName, leagueName, managerName, summary } = req.body as {
      clubName: string;
      leagueName: string;
      managerName: string;
      summary: string;
    };

    const prompt = `Gere 2 postagens curtas estilo rede social brasileira de futebol ("FootSocial") comentando este momento do clube:
- Clube: ${clubName} (${leagueName})
- Técnico: ${managerName}
- Acontecimento: ${summary}
Uma postagem deve ser de um jornalista/analista e a outra de um torcedor apaixonado ou perfil de humor futebolístico.`;

    const parsed = await generateStructuredJson<Array<Record<string, unknown>>>(ai, {
      contents: prompt,
      systemInstruction:
        'Responda apenas JSON válido em português do Brasil, curto, realista e divertido.',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ['author', 'handle', 'role', 'content'],
          properties: {
            author: { type: Type.STRING },
            handle: { type: Type.STRING },
            role: { type: Type.STRING },
            content: { type: Type.STRING },
          },
        },
      },
    });

    res.json({ posts: Array.isArray(parsed) ? parsed : [] });
  } catch (err) {
    const friendly = formatFriendlyGeminiError(err);
    res.status(friendly.status).json({ error: friendly.message });
  }
});

app.post('/api/chat/locker', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
      return;
    }

    const {
      managerName,
      clubName,
      leagueName,
      rank,
      cohesion,
      targetType,
      targetName,
      targetRole,
      targetMorale,
      targetAge,
      targetOvr,
      targetStarter,
      userMessage,
      recentHistory,
    } = req.body as {
      managerName: string;
      clubName: string;
      leagueName: string;
      rank: number;
      cohesion: number;
      targetType: 'GROUP' | 'PLAYER' | 'CEO' | 'STAFF';
      targetName: string;
      targetRole?: string;
      targetMorale?: number;
      targetAge?: number;
      targetOvr?: number;
      targetStarter?: boolean;
      userMessage: string;
      recentHistory?: Array<{ senderName: string; text: string }>;
    };

    const historyText = Array.isArray(recentHistory)
      ? recentHistory
          .slice(-6)
          .map((m) => `${m.senderName}: ${m.text}`)
          .join('\n')
      : '';

    const contextLines = [
      `Clube: ${clubName} (${leagueName})`,
      `Técnico(a): ${managerName}`,
      `Posição atual na tabela: ${rank}º lugar | Entrosamento do elenco: ${cohesion}%`,
      `Canal: ${
        targetType === 'GROUP'
          ? 'Grupo oficial do elenco no VestiárioZap (1 a 2 jogadores ou capitão respondem em mensagens curtas estilo WhatsApp)'
          : targetType === 'CEO'
            ? `Conversa direta com a Diretoria/CEO (${targetName})`
            : targetType === 'STAFF'
              ? `Conversa com membro da Comissão Técnica (${targetName} - ${targetRole || 'Auxiliar'})`
              : `Conversa privada 1-a-1 com o atleta ${targetName} (${targetRole || 'Jogador'}, ${targetAge || 24} anos, OVR ${targetOvr || 75}, Moral ${targetMorale ?? 75}%, ${targetStarter ? 'Titular' : 'Reserva'})`
      }`,
      historyText ? `Últimas mensagens:\n${historyText}` : '',
      `Mensagem do técnico agora: "${userMessage}"`,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `${contextLines}

Responda como no VestiárioZap (estilo WhatsApp realista de futebol brasileiro, mensagens curtas, naturais e diretas em PT-BR).
Avalie o tom da mensagem do técnico (se motiva, cobra com respeito, promete minutos/título ou gera atrito) e defina:
- replies: 1 a 2 mensagens curtas de resposta (sempre pelo menos 1 resposta; para GROUP pode ter 2 jogadores diferentes; para PLAYER/CEO/STAFF use 1 resposta direta do interlocutor).
- moraleDelta: inteiro de -8 a +8 (impacto na moral do jogador/grupo).
- cohesionDelta: inteiro de -5 a +6 (impacto no entrosamento do elenco).
- confidenceDelta: inteiro de -6 a +6 (impacto na confiança da diretoria, principalmente se for CEO ou assunto público).
- createdPromise: opcional, preencha APENAS se o técnico fez uma promessa concreta (ex: dar titularidade, vencer próximo jogo, contratar reforço, melhorar treino) com summary curto e dueDays (entre 3 e 15).`;

    const parsed = await generateStructuredJson<{
      replies?: Array<{ senderName?: string; senderRole?: string; text?: string }>;
      moraleDelta?: number;
      cohesionDelta?: number;
      confidenceDelta?: number;
      createdPromise?: { summary?: string; dueDays?: number };
    }>(ai, {
      contents: prompt,
      systemInstruction:
        'Você simula conversas de vestiário de futebol brasileiro no estilo WhatsApp. Sempre retorne pelo menos 1 item válido em replies, em português brasileiro natural, respondendo exclusivamente em JSON.',
      responseSchema: {
        type: Type.OBJECT,
        required: ['replies', 'moraleDelta', 'cohesionDelta', 'confidenceDelta'],
        properties: {
          replies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['senderName', 'senderRole', 'text'],
              properties: {
                senderName: { type: Type.STRING },
                senderRole: { type: Type.STRING },
                text: { type: Type.STRING },
              },
            },
          },
          moraleDelta: { type: Type.INTEGER },
          cohesionDelta: { type: Type.INTEGER },
          confidenceDelta: { type: Type.INTEGER },
          createdPromise: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              dueDays: { type: Type.INTEGER },
            },
          },
        },
      },
    });

    const clamp = (v: number | undefined, min: number, max: number) =>
      Math.max(min, Math.min(max, Math.round(Number(v) || 0)));

    const cleanReplies = Array.isArray(parsed.replies)
      ? parsed.replies.filter((r) => Boolean(r?.text && r.text.trim())).slice(0, 2)
      : [];

    if (cleanReplies.length === 0) {
      res.status(502).json({ error: 'A IA retornou uma resposta vazia. Tente enviar novamente.' });
      return;
    }

    res.json({
      replies: cleanReplies,
      moraleDelta: clamp(parsed.moraleDelta, -8, 8),
      cohesionDelta: clamp(parsed.cohesionDelta, -5, 6),
      confidenceDelta: clamp(parsed.confidenceDelta, -6, 6),
      createdPromise:
        parsed.createdPromise && parsed.createdPromise.summary
          ? {
              summary: parsed.createdPromise.summary,
              dueDays: clamp(parsed.createdPromise.dueDays, 3, 15),
            }
          : undefined,
    });
  } catch (err) {
    const friendly = formatFriendlyGeminiError(err);
    res.status(friendly.status).json({ error: friendly.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`NextFoot server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
