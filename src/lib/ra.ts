// Identificação do desafio pelos dois últimos dígitos do RA.

export type ChallengeId = 'arquivos' | 'integridade' | 'assimetrica' | 'tls' | 'armazenados';

export interface ChallengeRange {
  id: ChallengeId;
  min: number;
  max: number;
  title: string;
  technique: string;
}

export const CHALLENGE_RANGES: ChallengeRange[] = [
  { id: 'arquivos', min: 0, max: 19, title: 'Proteção de arquivos', technique: 'AES-256-GCM' },
  { id: 'integridade', min: 20, max: 39, title: 'Integridade de documentos', technique: 'SHA-256' },
  { id: 'assimetrica', min: 40, max: 59, title: 'Criptografia assimétrica', technique: 'RSA-OAEP' },
  { id: 'tls', min: 60, max: 79, title: 'Comunicação segura', technique: 'Simulação didática de TLS' },
  { id: 'armazenados', min: 80, max: 99, title: 'Proteção de dados armazenados', technique: 'AES-256-GCM' },
];

export type RaResult =
  | { ok: true; digits: string; lastTwo: number; range: ChallengeRange }
  | { ok: false; error: string };

/** Lê o RA, considera apenas os dígitos e usa os dois últimos para escolher o desafio. */
export function resolveRa(input: string): RaResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Informe o seu RA.' };
  if (trimmed.length > 30) return { ok: false, error: 'RA muito longo. Verifique o valor digitado.' };
  if (!/^[0-9A-Za-z.\-\s/]+$/.test(trimmed)) {
    return { ok: false, error: 'Use apenas números (pontos, traços ou letras de verificação são ignorados).' };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 2) return { ok: false, error: 'O RA precisa ter pelo menos dois dígitos.' };
  const lastTwo = Number(digits.slice(-2));
  const range = CHALLENGE_RANGES.find((r) => lastTwo >= r.min && lastTwo <= r.max)!;
  return { ok: true, digits, lastTwo, range };
}

export const formatRange = (r: ChallengeRange) =>
  `${String(r.min).padStart(2, '0')}–${String(r.max).padStart(2, '0')}`;
