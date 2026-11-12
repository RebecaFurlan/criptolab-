// Geração do relatório PDF (jsPDF), no formato de "relatório de entrega" da instituição:
// cabeçalho com logotipos, tabela de identificação, instruções e quadros com título cinza.
// Roda inteiramente no navegador e NUNCA inclui chaves privadas ou segredos criptográficos.

import { jsPDF } from 'jspdf';
import { CHALLENGES, LGPD_QUESTIONS, STEP_QUESTIONS } from '../data/questions';
import { REFERENCES, referenceText } from '../data/references';
import { MODULE_LABEL } from '../nav';
import { resolveRa } from './ra';
import { MODULE_REQUIREMENTS, redactSecrets, type LabState, type ModuleId } from '../store';

/** Fontes padrão do PDF usam WinAnsi: troca símbolos fora desse conjunto. */
export function pdfSafe(text: string): string {
  return redactSecrets(text)
    .replace(/[→⟶]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/↺/g, '')
    .replace(/[✓✔]/g, 'OK')
    .replace(/[✗✘]/g, 'X')
    .replace(/[–—]/g, '-')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/×/g, 'x')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + [...m].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).join(''))
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '');
}

type RGB = readonly [number, number, number];
// Paleta do modelo de relatório (títulos azul-petróleo, quadros com cabeçalho cinza-claro).
const C = {
  title: [31, 42, 40] as RGB, // #1F2A28
  h1: [11, 110, 134] as RGB, // #0B6E86
  h3: [86, 100, 95] as RGB, // #56645F
  text: [31, 42, 40] as RGB,
  placeholder: [138, 149, 144] as RGB, // #8A9590
  fill: [238, 242, 241] as RGB, // #EEF2F1
  border: [86, 100, 95] as RGB,
  ok: [5, 120, 85] as RGB,
};

export interface ReportOptions {
  generatedAt?: Date;
  /** Logotipos da instituição (data URL JPEG/PNG). */
  logo?: string;
  disciplina?: string;
}

export function buildReport(state: LabState, opts: ReportOptions = {}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 22; // margens próximas às do modelo (2,54 cm)
  const CW = W - 2 * M;
  const BOTTOM = H - 18;
  let y = 20;
  const now = opts.generatedAt ?? new Date();
  const r = state.ra ? resolveRa(state.ra) : null;
  const ev = state.evidence;

  const color = (c: RGB, kind: 'text' | 'fill' | 'draw' = 'text') =>
    kind === 'text' ? doc.setTextColor(c[0], c[1], c[2]) : kind === 'fill' ? doc.setFillColor(c[0], c[1], c[2]) : doc.setDrawColor(c[0], c[1], c[2]);
  const font = (size: number, style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', c: RGB = C.text) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    color(c);
  };
  const lh = (size: number) => size * 0.42;
  const newPage = () => {
    doc.addPage();
    y = 20;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const wrap = (text: string, width: number) => doc.splitTextToSize(pdfSafe(text), width) as string[];

  /** Parágrafo simples. `rich` permite um rótulo em negrito no início. */
  const para = (text: string, size = 9.5, opt: { style?: 'normal' | 'bold' | 'italic'; c?: RGB; label?: string; indent?: number; gap?: number } = {}) => {
    const indent = opt.indent ?? 0;
    font(size, opt.style ?? 'normal', opt.c ?? C.text);
    const full = opt.label ? `${opt.label} ${text}` : text;
    const lines = wrap(full, CW - indent);
    lines.forEach((line, i) => {
      ensure(lh(size));
      if (i === 0 && opt.label) {
        font(size, 'bold', opt.c ?? C.text);
        const lbl = pdfSafe(opt.label);
        doc.text(lbl, M + indent, y);
        const lw = doc.getTextWidth(lbl + ' ');
        font(size, opt.style ?? 'normal', opt.c ?? C.text);
        doc.text(line.slice(lbl.length + 1), M + indent + lw, y);
      } else doc.text(line, M + indent, y);
      y += lh(size) + 0.6;
    });
    y += opt.gap ?? 1.8;
  };

  const bullet = (label: string, text: string) => {
    font(9.5, 'normal');
    ensure(lh(9.5));
    doc.circle(M + 4, y - 1.1, 0.55, 'F');
    const lines = wrap(`${label} ${text}`, CW - 9);
    lines.forEach((line, i) => {
      ensure(lh(9.5));
      if (i === 0) {
        font(9.5, 'bold');
        const lbl = pdfSafe(label);
        doc.text(lbl, M + 8, y);
        const lw = doc.getTextWidth(lbl + ' ');
        font(9.5, 'normal');
        doc.text(line.slice(lbl.length + 1), M + 8 + lw, y);
      } else doc.text(line, M + 8, y);
      y += lh(9.5) + 0.6;
    });
    y += 0.6;
  };

  const h1 = (text: string) => {
    ensure(16);
    y += 4;
    font(15, 'bold', C.h1);
    doc.text(pdfSafe(text), M, y);
    y += 6.5;
  };
  const h2 = (text: string) => {
    ensure(12);
    font(12.5, 'bold', C.title);
    doc.text(pdfSafe(text), M, y);
    y += 7;
  };
  const h3 = (text: string) => {
    ensure(18);
    y += 3;
    font(10, 'normal', C.h3);
    doc.text(pdfSafe(text.toUpperCase()), M, y);
    y += 5;
  };

  /** Quadro do modelo: faixa de título cinza com texto em negrito + área de conteúdo com borda. */
  const box = (title: string, content: string, opt: { placeholder?: string; minBody?: number; image?: string } = {}) => {
    const pad = 2.6;
    font(9, 'bold');
    const titleLines = wrap(title, CW - 2 * pad);
    const titleH = titleLines.length * lh(9) + 0.6 * (titleLines.length - 1) + 2 * pad - 0.6;
    const empty = !content.trim() && !opt.image;
    const bodySize = 9.5;
    font(bodySize, empty ? 'italic' : 'normal');
    const bodyLines = opt.image ? [] : wrap(empty ? opt.placeholder ?? 'Não preenchido.' : content, CW - 2 * pad);
    const lineH = lh(bodySize) + 0.6;
    const minBody = opt.minBody ?? 12;

    let imgW = 0;
    let imgH = 0;
    if (opt.image) {
      try {
        const p = doc.getImageProperties(opt.image);
        imgW = CW - 2 * pad;
        imgH = (p.height / p.width) * imgW;
        if (imgH > 110) {
          imgH = 110;
          imgW = (p.width / p.height) * imgH;
        }
      } catch {
        opt.image = undefined;
      }
    }

    // Garante que o título e ao menos parte do corpo fiquem juntos.
    ensure(titleH + Math.min(opt.image ? imgH + 2 * pad : Math.max(minBody, bodyLines.length * lineH + 2 * pad), 30));

    const drawTitle = (cont: boolean) => {
      const tl = cont ? wrap(`${title} (continuação)`, CW - 2 * pad) : titleLines;
      const th = tl.length * lh(9) + 0.6 * (tl.length - 1) + 2 * pad - 0.6;
      color(C.fill, 'fill');
      color(C.border, 'draw');
      doc.setLineWidth(0.25);
      doc.rect(M, y, CW, th, 'FD');
      font(9, 'bold');
      tl.forEach((l, i) => doc.text(l, M + pad, y + pad + lh(9) - 0.6 + i * (lh(9) + 0.6)));
      y += th;
    };

    drawTitle(false);

    if (opt.image) {
      const bodyH = imgH + 2 * pad;
      if (y + bodyH > BOTTOM) {
        newPage();
        drawTitle(true);
      }
      color(C.border, 'draw');
      doc.rect(M, y, CW, bodyH);
      doc.addImage(opt.image, 'JPEG', M + pad + (CW - 2 * pad - imgW) / 2, y + pad, imgW, imgH);
      y += bodyH + 5;
      return;
    }

    let i = 0;
    while (i < bodyLines.length || i === 0) {
      const room = Math.floor((BOTTOM - y - 2 * pad) / lineH);
      if (room < 1) {
        newPage();
        drawTitle(true);
        continue;
      }
      const chunk = bodyLines.slice(i, i + room);
      const isLast = i + chunk.length >= bodyLines.length;
      const bodyH = Math.max(chunk.length * lineH + 2 * pad, isLast && i === 0 ? minBody : 0);
      color(C.border, 'draw');
      doc.setLineWidth(0.25);
      doc.rect(M, y, CW, bodyH);
      font(bodySize, empty ? 'italic' : 'normal', empty ? C.placeholder : C.text);
      chunk.forEach((l, k) => doc.text(l, M + pad, y + pad + lh(bodySize) - 0.6 + k * lineH));
      y += bodyH;
      i += chunk.length;
      if (!isLast) {
        newPage();
        drawTitle(true);
      } else break;
    }
    y += 5;
  };

  /** Tabela de duas colunas no estilo "Identificação | Preencher". */
  const table = (head: [string, string], rows: [string, string][], col1 = 52) => {
    const pad = 2.4;
    const rowH = (cells: string[]) =>
      Math.max(...cells.map((c, i) => wrap(c || ' ', (i === 0 ? col1 : CW - col1) - 2 * pad).length)) * (lh(9.5) + 0.6) + 2 * pad - 0.6;
    const drawRow = (cells: [string, string], header: boolean) => {
      const h = rowH(cells);
      ensure(h);
      color(C.border, 'draw');
      doc.setLineWidth(0.25);
      if (header) {
        color(C.fill, 'fill');
        doc.rect(M, y, CW, h, 'FD');
      } else doc.rect(M, y, CW, h);
      doc.line(M + col1, y, M + col1, y + h);
      cells.forEach((c, i) => {
        font(9.5, header ? 'bold' : 'normal', !header && i === 1 && !c ? C.placeholder : C.text);
        wrap(c || '-', (i === 0 ? col1 : CW - col1) - 2 * pad).forEach((l, k) =>
          doc.text(l, M + (i === 0 ? 0 : col1) + pad, y + pad + lh(9.5) - 0.6 + k * (lh(9.5) + 0.6)),
        );
      });
      y += h;
    };
    drawRow(head, true);
    rows.forEach((row) => drawRow(row, false));
    y += 6;
  };

  /* ================= Página 1: cabeçalho e identificação ================= */
  font(13, 'bold', C.title);
  doc.text(pdfSafe('Relatório de entrega — Laboratório Interativo de Criptografia'), M, y);
  y += 6;

  if (opts.logo) {
    try {
      const p = doc.getImageProperties(opts.logo);
      const lw = CW;
      const lhgt = (p.height / p.width) * lw;
      doc.addImage(opts.logo, 'JPEG', M, y, lw, lhgt);
      y += lhgt + 7;
    } catch {
      y += 3;
    }
  } else y += 3;

  font(9.5, 'bold');
  doc.text('ATIVIDADE INDIVIDUAL', M, y);
  y += 6;
  para(opts.disciplina ?? 'Segurança da Informação', 9.5, { label: 'Disciplina:', gap: 0.8 });
  para(now.toLocaleDateString('pt-BR'), 9.5, { label: 'Data:', gap: 1.6 });
  para('Relatório do Laboratório de Criptografia', 9.5, { style: 'bold', gap: 2 });

  table(
    ['Identificação', 'Preenchimento'],
    [
      ['RA', ev.ra || state.ra],
      ['Últimos dois dígitos do RA', r && r.ok ? String(r.lastTwo).padStart(2, '0') : ''],
      ['Turma / período', ev.turma],
      ['Desafio recebido', ev.desafio || (r && r.ok ? r.range.title : '')],
      ['Técnica utilizada', ev.tecnica || (r && r.ok ? r.range.technique : '')],
      ['Início da atividade', new Date(state.startedAt).toLocaleString('pt-BR')],
      ['Relatório gerado em', now.toLocaleString('pt-BR')],
    ],
  );

  /* ================= Resumo da atividade ================= */
  h1('Resumo da atividade');
  para('Atividade prática realizada no Laboratório Interativo de Criptografia. Situação de cada módulo:');
  (Object.keys(MODULE_REQUIREMENTS) as ModuleId[]).forEach((mId) => {
    const req = MODULE_REQUIREMENTS[mId];
    const done = req.filter((x) => state.milestones[x]).length;
    const pct = Math.round((done / req.length) * 100);
    const label = mId === 'relatorio' ? 'concluído (este relatório).' : pct === 100 ? 'concluído.' : pct > 0 ? `em andamento (${pct}%).` : 'não iniciado.';
    bullet(`${MODULE_LABEL[mId]}:`, label);
  });
  const techniques = [...new Set(state.log.map((l) => l.technique))];
  para(techniques.length ? techniques.join('; ') + '.' : 'nenhuma operação registrada.', 9.5, { label: 'Técnicas utilizadas:' });
  para(
    'AES-256-GCM, RSA-OAEP, SHA-256, PBKDF2 e a criptografia híbrida foram executados de verdade pela Web Crypto API do navegador. A Cifra de César, as demonstrações de DES, 3DES, DESX, Camellia, Blowfish, Twofish, SAFER e IDEA e a simulação de TLS são exemplos didáticos.',
    9.5,
    { label: 'Atenção:' },
  );
  para('este relatório não contém chaves privadas, chaves secretas nem outros segredos criptográficos. Todos os dados pessoais usados na atividade são fictícios.', 9.5, {
    label: 'Segurança:',
  });

  /* ================= Parte 1: desafio por RA ================= */
  newPage();
  h1('Parte 1');
  h2(`Desafio por RA${r && r.ok ? ` — ${r.range.title}` : ''}`);
  if (r && r.ok) box('Objetivo do desafio', CHALLENGES[r.range.id].objective);
  box('Mensagem original de teste', ev.mensagem, { placeholder: 'Não preenchido.' });
  box('Resultado da operação', ev.resultado, { placeholder: 'Não preenchido.' });

  h3('Evidências');
  if (!state.attachments.length) box('Capturas de tela', '', { placeholder: 'Nenhuma captura de tela foi anexada.', minBody: 20 });
  state.attachments.forEach((a, i) => box(`Evidência ${i + 1}: ${a.caption || a.name}`, '', { image: a.dataUrl }));

  box('O que aconteceu? Explicação do resultado com suas palavras.', ev.explicacao);
  if (r && r.ok)
    CHALLENGES[r.range.id].questions.forEach((q, i) => box(`Pergunta ${i + 1}: ${q}`, state.answers[`desafio:${r.range.id}:q${i + 1}`] ?? '', { placeholder: 'Sem resposta.' }));

  /* ================= Parte 2: proteção de dados pessoais ================= */
  newPage();
  h1('Parte 2');
  h2('Proteção de dados pessoais na prática');
  para('Atividade realizada com um cadastro fictício (nome, telefone, RG e endereço), protegido com AES-256-GCM, SHA-256 e criptografia híbrida AES + RSA.', 9.5, {
    gap: 3,
  });
  Object.entries(STEP_QUESTIONS).forEach(([id, q], i) => box(`Etapa ${i + 1} — Pergunta: ${q}`, state.answers[id] ?? '', { placeholder: 'Sem resposta.' }));
  h3('Reflexão sobre segurança e LGPD');
  LGPD_QUESTIONS.forEach((q, i) => box(`Pergunta ${i + 1}: ${q}`, state.answers[`lgpd:q${i + 1}`] ?? '', { placeholder: 'Sem resposta.' }));

  /* ================= Parte 3: registro das operações ================= */
  newPage();
  h1('Parte 3');
  h2('Registro das operações');
  para('Operações registradas automaticamente pelo laboratório (mais recentes primeiro, até 40).', 9.5, { gap: 3 });
  const ops = [...state.log].reverse().slice(0, 40);
  table(
    ['Hora · técnica', 'Operação e resultado'],
    ops.length
      ? ops.map((l) => [
          `${new Date(l.time).toLocaleTimeString('pt-BR')} · ${l.technique}`,
          `${l.action}${l.ok ? '' : ' (falhou)'}${l.output ? `\nResultado: ${l.output}` : ''}`,
        ])
      : [['-', 'Nenhuma operação registrada.']],
    58,
  );

  /* ================= Parte 4: conclusão ================= */
  h1('Parte 4');
  h2('Dificuldades e conclusão');
  box('Dificuldades encontradas', ev.dificuldades);
  box('Conclusão do estudante', ev.conclusao);

  /* ================= Referências ================= */
  h1('Referências');
  REFERENCES.forEach((ref) => para(referenceText(ref), 9, { gap: 2.4 }));

  /* ================= Rodapé ================= */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(8, 'normal', C.placeholder);
    doc.text(pdfSafe(`Laboratório Interativo de Criptografia · RA ${ev.ra || state.ra || '-'}`), M, H - 10);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 10, { align: 'right' });
  }
  return doc;
}

export function reportFilename(state: LabState, d = new Date()): string {
  const ra = (state.evidence.ra || state.ra).replace(/\D/g, '') || 'sem-ra';
  return `relatorio-criptolab-${ra}-${d.toISOString().slice(0, 10)}.pdf`;
}
