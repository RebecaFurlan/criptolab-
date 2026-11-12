import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Packer } from 'docx';
import { buildReportDocx, jpegSize } from '../lib/reportDocx';
import type { LabState } from '../store';

const state: LabState = {
  ra: '2026000185',
  milestones: { 'intro:fluxo': 'ok', 'desafio:ra': 'ok' },
  answers: { 'desafio:armazenados:q1': 'Somente texto cifrado.', 'lgpd:q1': 'Não, sem a chave. -----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----' },
  log: [{ id: '1', time: new Date().toISOString(), module: 'desafio', technique: 'AES-256-GCM + PBKDF2', action: 'Registros cifrados', output: 'q3Xv9', ok: true }],
  evidence: { ra: '2026000185', turma: '2º semestre', desafio: 'Proteção de dados armazenados', tecnica: 'AES-256-GCM', mensagem: 'Teste', resultado: 'Linha 1\nLinha 2', explicacao: 'Ficou ilegível.', dificuldades: '', conclusao: 'Aprendi.' },
  attachments: [],
  startedAt: new Date().toISOString(),
};

describe('Relatório Word', () => {
  it('gera .docx com instruções do Teams, logo e sem chave privada', async () => {
    const logo = new Uint8Array(fs.readFileSync('src/assets/logos-instituicao.jpg'));
    expect(jpegSize(logo)).toEqual({ width: 1200, height: 180 });
    const shot = { ...state, attachments: [{ id: 'a', name: 'print.jpg', type: 'image/jpeg', size: logo.length, caption: 'Print do desafio', dataUrl: 'data:image/jpeg;base64,' + Buffer.from(logo).toString('base64') }] };
    const buf = await Packer.toBuffer(buildReportDocx(shot, { logo }));
    fs.writeFileSync('/tmp/teste-relatorio.docx', buf);
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    const { execFileSync } = await import('node:child_process');
    const xml = execFileSync('unzip', ['-p', '/tmp/teste-relatorio.docx', 'word/document.xml']).toString('utf8');
    const media = execFileSync('unzip', ['-Z1', '/tmp/teste-relatorio.docx']).toString().split('\n').filter((f) => f.startsWith('word/media/'));
    for (const s of ['Instruções', 'Microsoft Teams', 'Adicionar trabalho', 'Entregar', '2026000185', 'Pergunta 1', 'Referências']) expect(xml).toContain(s);
    expect(xml).not.toContain('BEGIN PRIVATE KEY');
    expect(media.length).toBeGreaterThanOrEqual(1); // imagens idênticas são deduplicadas
  });
});
