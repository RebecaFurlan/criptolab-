import { describe, expect, it } from 'vitest';
import { buildReport, pdfSafe, reportFilename } from '../lib/report';
import type { LabState } from '../store';
import fs from 'node:fs';
import { exportPrivatePem, generateRsaKeyPair } from '../lib/crypto';

async function sampleState(): Promise<LabState> {
  const kp = await generateRsaKeyPair();
  const pem = await exportPrivatePem(kp.privateKey);
  return {
    ra: '2026001234',
    milestones: { 'intro:fluxo': 'ok', 'intro:quiz': 'ok', 'sim:aes': 'ok', 'desafio:ra': 'ok' },
    answers: {
      'desafio:integridade:q1': 'Porque o hash muda completamente com qualquer alteração.',
      'lgpd:q1': `Não. Minha chave: ${pem}`,
    },
    log: [
      { id: '1', time: new Date().toISOString(), module: 'simulacoes', technique: 'AES-256-GCM', action: 'Criptografia', input: 'oi', output: 'q3Xv9+Lk2P', ok: true },
    ],
    evidence: {
      ra: '2026001234',
      turma: '2º semestre - noite',
      desafio: 'Integridade de documentos',
      tecnica: 'SHA-256',
      mensagem: 'Contrato fictício → teste “aspas”',
      resultado: 'Hash diferente após alteração ✓',
      explicacao: 'Efeito avalanche',
      dificuldades: 'Nenhuma',
      conclusao: 'Hash garante integridade, não sigilo.',
    },
    attachments: [],
    startedAt: new Date().toISOString(),
  };
}

describe('Relatório PDF', () => {
  it('gera um PDF válido com as seções obrigatórias e sem chaves privadas', async () => {
    const state = await sampleState();
    const logo = 'data:image/jpeg;base64,' + fs.readFileSync('src/assets/logos-instituicao.jpg').toString('base64');
    const doc = buildReport(state, { generatedAt: new Date('2026-11-12T15:00:00-03:00'), logo });
    fs.writeFileSync('/tmp/teste-relatorio.pdf', new Uint8Array(doc.output('arraybuffer')));
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text.startsWith('%PDF-')).toBe(true);
    for (const s of ['Identifica', 'ATIVIDADE INDIVIDUAL', 'Resumo da atividade', 'cnicas utilizadas', 'Resultado da opera', 'EVID', 'Pergunta', 'Conclus', 'Refer']) {
      expect(text).toContain(s);
    }
    expect(text).toContain('2026001234');
    expect(text).not.toContain('BEGIN PRIVATE KEY');
    expect(text).toContain('CHAVE PRIVADA OMITIDA');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it('pdfSafe troca símbolos fora do WinAnsi', () => {
    expect(pdfSafe('A → B “x” – 2²⁵⁶ ✓')).toBe('A -> B "x" - 2^256 OK');
    expect(pdfSafe('ação é ç')).toBe('ação é ç');
  });

  it('nome do arquivo usa apenas os dígitos do RA', async () => {
    const s = await sampleState();
    expect(reportFilename(s, new Date('2026-11-12T12:00:00Z'))).toBe('relatorio-criptolab-2026001234-2026-11-12.pdf');
  });
});
