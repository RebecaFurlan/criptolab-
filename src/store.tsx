// Estado global do laboratório. Fica apenas no navegador (sessionStorage).
// IMPORTANTE: chaves criptográficas NUNCA são gravadas aqui.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { truncate } from './lib/encoding';

export type ModuleId = 'introducao' | 'algoritmos' | 'simulacoes' | 'desafio' | 'protecao' | 'evidencias' | 'relatorio';

export interface LogEntry {
  id: string;
  time: string;
  module: ModuleId;
  technique: string;
  action: string;
  input?: string;
  output?: string;
  ok: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  caption: string;
}

export interface EvidenceForm {
  ra: string;
  turma: string;
  desafio: string;
  tecnica: string;
  mensagem: string;
  resultado: string;
  explicacao: string;
  dificuldades: string;
  conclusao: string;
}

export interface LabState {
  ra: string;
  /** Marcos concluídos, ex.: "sim:aes", "protecao:etapa3". */
  milestones: Record<string, string>;
  answers: Record<string, string>;
  log: LogEntry[];
  evidence: EvidenceForm;
  attachments: Attachment[];
  startedAt: string;
}

const EMPTY_EVIDENCE: EvidenceForm = {
  ra: '',
  turma: '',
  desafio: '',
  tecnica: '',
  mensagem: '',
  resultado: '',
  explicacao: '',
  dificuldades: '',
  conclusao: '',
};

const initialState = (): LabState => ({
  ra: '',
  milestones: {},
  answers: {},
  log: [],
  evidence: { ...EMPTY_EVIDENCE },
  attachments: [],
  startedAt: new Date().toISOString(),
});

const STORAGE_KEY = 'criptolab:v1';

function load(): LabState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<LabState>;
    return { ...initialState(), ...parsed, evidence: { ...EMPTY_EVIDENCE, ...(parsed.evidence ?? {}) } };
  } catch {
    return initialState();
  }
}

/** Padrões que nunca devem ir para o registro/relatório (chaves privadas, JWK privados). */
const SECRET_PATTERNS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, /"d"\s*:\s*"[^"]+"/g];

export function redactSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((t, re) => t.replace(re, '[CHAVE PRIVADA OMITIDA]'), text);
}

interface Ctx {
  state: LabState;
  setRa: (ra: string) => void;
  mark: (milestone: string, label?: string) => void;
  setAnswer: (id: string, value: string) => void;
  addLog: (e: Omit<LogEntry, 'id' | 'time'>) => void;
  setEvidence: (patch: Partial<EvidenceForm>) => void;
  addAttachment: (a: Omit<Attachment, 'id'>) => void;
  updateAttachment: (id: string, patch: Partial<Attachment>) => void;
  removeAttachment: (id: string) => void;
  reset: () => void;
  progress: Record<ModuleId, number>;
  overall: number;
}

const LabContext = createContext<Ctx | null>(null);

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 12);

/** Marcos necessários para cada módulo ser considerado concluído. */
export const MODULE_REQUIREMENTS: Record<ModuleId, string[]> = {
  introducao: ['intro:fluxo', 'intro:quiz'],
  algoritmos: ['alg:visto3', 'alg:demo'],
  simulacoes: ['sim:cesar', 'sim:aes', 'sim:rsa', 'sim:sha'],
  desafio: ['desafio:ra', 'desafio:execucao', 'desafio:respostas'],
  protecao: ['prot:etapa1', 'prot:etapa2', 'prot:etapa3', 'prot:etapa4', 'prot:etapa5', 'prot:etapa6', 'prot:etapa7'],
  evidencias: ['evid:preenchido'],
  relatorio: ['rel:gerado'],
};

export function LabProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LabState>(load);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Cota excedida (anexos grandes): salva sem os anexos.
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, attachments: [] }));
        } catch {
          /* armazenamento indisponível: segue apenas em memória */
        }
      }
    }, 300);
  }, [state]);

  const mark = useCallback((m: string, label = 'ok') => {
    setState((s) => (s.milestones[m] ? s : { ...s, milestones: { ...s.milestones, [m]: label } }));
  }, []);

  const addLog = useCallback((e: Omit<LogEntry, 'id' | 'time'>) => {
    const entry: LogEntry = {
      ...e,
      id: uid(),
      time: new Date().toISOString(),
      input: e.input !== undefined ? truncate(redactSecrets(e.input), 160) : undefined,
      output: e.output !== undefined ? truncate(redactSecrets(e.output), 160) : undefined,
    };
    setState((s) => ({ ...s, log: [...s.log, entry].slice(-200) }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const progress = Object.fromEntries(
      (Object.keys(MODULE_REQUIREMENTS) as ModuleId[]).map((k) => {
        const req = MODULE_REQUIREMENTS[k];
        return [k, req.filter((r) => state.milestones[r]).length / req.length];
      }),
    ) as Record<ModuleId, number>;
    const overall = Object.values(progress).reduce((a, b) => a + b, 0) / Object.keys(progress).length;
    return {
      state,
      progress,
      overall,
      mark,
      addLog,
      setRa: (ra) => setState((s) => ({ ...s, ra, evidence: { ...s.evidence, ra } })),
      setAnswer: (id, v) => setState((s) => ({ ...s, answers: { ...s.answers, [id]: v } })),
      setEvidence: (patch) => setState((s) => ({ ...s, evidence: { ...s.evidence, ...patch } })),
      addAttachment: (a) => setState((s) => ({ ...s, attachments: [...s.attachments, { ...a, id: uid() }] })),
      updateAttachment: (id, patch) =>
        setState((s) => ({ ...s, attachments: s.attachments.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeAttachment: (id) => setState((s) => ({ ...s, attachments: s.attachments.filter((x) => x.id !== id) })),
      reset: () => {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setState(initialState());
      },
    };
  }, [state, mark, addLog]);

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab(): Ctx {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLab deve ser usado dentro de <LabProvider>.');
  return ctx;
}
