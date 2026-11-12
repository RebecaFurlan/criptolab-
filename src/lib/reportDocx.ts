// Relatório em Word (.docx), no formato do "Relatório de entrega" da instituição.
// Gerado no navegador com a biblioteca docx. NUNCA inclui chaves ou segredos criptográficos.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from 'docx';
import { CHALLENGES, LGPD_QUESTIONS, STEP_QUESTIONS } from '../data/questions';
import { REFERENCES, referenceText } from '../data/references';
import { MODULE_LABEL } from '../nav';
import { resolveRa } from './ra';
import { MODULE_REQUIREMENTS, redactSecrets, type LabState, type ModuleId } from '../store';

export const SITE_URL = 'criptolab-three.vercel.app';

const FONT = 'Calibri';
const COLOR = { title: '1F2A28', h1: '0B6E86', h3: '56645F', placeholder: '8A9590', fill: 'EEF2F1', border: '56645F' };
// A4 com margens de 2,54 cm (1440 DXA), como no modelo.
const CONTENT_W = 11906 - 2 * 1440; // 9026 DXA
const PX_PER_DXA = 96 / 1440;

const clean = (t: string) => redactSecrets(t ?? '');

export interface DocxOptions {
  generatedAt?: Date;
  /** Logotipos da instituição em JPEG (bytes). */
  logo?: Uint8Array;
  disciplina?: string;
}

/* ---------------------- utilitários de imagem ---------------------- */

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Lê largura/altura de um JPEG (marcadores SOF). */
export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}

function fitImage(bytes: Uint8Array, maxWpx: number, maxHpx: number) {
  const s = jpegSize(bytes) ?? { width: 1200, height: 800 };
  let w = maxWpx;
  let h = (s.height / s.width) * w;
  if (h > maxHpx) {
    h = maxHpx;
    w = (s.width / s.height) * h;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

/* ---------------------- blocos do modelo ---------------------- */

const run = (text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text: clean(text), font: FONT, bold: o.bold, italics: o.italics, color: o.color, size: o.size });

/** Texto com quebras de linha → vários parágrafos. */
const paras = (text: string, o: { italics?: boolean; color?: string } = {}) =>
  clean(text)
    .split(/\r?\n/)
    .map((line) => new Paragraph({ spacing: { after: 60 }, children: [run(line, o)] }));

const p = (children: TextRun[], after = 120) => new Paragraph({ spacing: { after }, children });

const labeled = (label: string, text: string) => p([run(`${label} `, { bold: true }), run(text)]);

const border = { style: BorderStyle.SINGLE, size: 4, color: COLOR.border };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

/** Quadro do modelo: linha de título cinza + área de conteúdo (texto, imagem ou espaço para colar). */
function box(title: string, content: string | { image: Uint8Array } | null, placeholder = 'Não preenchido.', minHeight = 900): Table {
  let body: Paragraph[];
  if (content && typeof content === 'object') {
    const size = fitImage(content.image, (CONTENT_W - 240) * PX_PER_DXA, 420);
    body = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: 'jpg', data: content.image, transformation: size, altText: { name: title, description: title, title } })],
      }),
    ];
  } else if (content && content.trim()) {
    body = paras(content);
  } else {
    body = [new Paragraph({ children: [run(placeholder, { italics: true, color: COLOR.placeholder, size: 18 })] })];
  }
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders,
            margins: cellMargins,
            shading: { type: ShadingType.CLEAR, fill: COLOR.fill, color: 'auto' },
            children: [new Paragraph({ keepNext: true, children: [run(title, { bold: true, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        height: { value: minHeight, rule: 'atLeast' },
        children: [new TableCell({ width: { size: CONTENT_W, type: WidthType.DXA }, borders, margins: cellMargins, children: body })],
      }),
    ],
  });
}

const spacer = () => new Paragraph({ spacing: { after: 160 }, children: [] });

function twoColTable(head: [string, string], rows: [string, string][], col1 = 3200): Table {
  const col2 = CONTENT_W - col1;
  const cell = (text: string, w: number, header: boolean, empty = false) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders,
      margins: cellMargins,
      shading: header ? { type: ShadingType.CLEAR, fill: COLOR.fill, color: 'auto' } : undefined,
      children: header
        ? [new Paragraph({ children: [run(text, { bold: true })] })]
        : empty
          ? [new Paragraph({ children: [run('', {})] })]
          : paras(text),
    });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col1, col2],
    rows: [
      new TableRow({ tableHeader: true, children: [cell(head[0], col1, true), cell(head[1], col2, true)] }),
      ...rows.map(([a, b]) => new TableRow({ cantSplit: true, children: [cell(a, col1, false), cell(b, col2, false, !b)] })),
    ],
  });
}

const h1 = (text: string, pageBreak = false) =>
  new Paragraph({ style: 'Heading1', pageBreakBefore: pageBreak, children: [run(text)] });
const h2 = (text: string) => new Paragraph({ style: 'Heading2', children: [run(text)] });
const h3 = (text: string) => new Paragraph({ style: 'Heading3', children: [run(text.toUpperCase())] });
const bullet = (label: string, text: string) =>
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 40 }, children: [run(`${label} `, { bold: true }), run(text)] });

/* ---------------------- documento ---------------------- */

export function buildReportDocx(state: LabState, opts: DocxOptions = {}): Document {
  const now = opts.generatedAt ?? new Date();
  const r = state.ra ? resolveRa(state.ra) : null;
  const ev = state.evidence;
  const children: (Paragraph | Table)[] = [];

  // Cabeçalho
  children.push(new Paragraph({ style: 'Title', children: [run('Relatório de entrega — Laboratório Interativo de Criptografia')] }));
  if (opts.logo) {
    const size = fitImage(opts.logo, CONTENT_W * PX_PER_DXA, 200);
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new ImageRun({ type: 'jpg', data: opts.logo, transformation: size, altText: { name: 'Logos', description: 'Fatec Ferraz de Vasconcelos e Centro Paula Souza', title: 'Logos' } })],
      }),
    );
  }
  children.push(p([run('ATIVIDADE INDIVIDUAL', { bold: true })], 60));
  children.push(labeled('Disciplina:', opts.disciplina ?? 'Segurança da Informação'));
  children.push(labeled('Data:', now.toLocaleDateString('pt-BR')));
  children.push(p([run('Relatório do Laboratório de Criptografia', { bold: true })]));

  children.push(
    twoColTable(
      ['Identificação', 'Preencher'],
      [
        ['RA', ev.ra || state.ra],
        ['Últimos dois dígitos do RA', r && r.ok ? String(r.lastTwo).padStart(2, '0') : ''],
        ['Turma / período', ev.turma],
        ['Desafio recebido', ev.desafio || (r && r.ok ? r.range.title : '')],
        ['Técnica utilizada', ev.tecnica || (r && r.ok ? r.range.technique : '')],
        ['Início da atividade', new Date(state.startedAt).toLocaleString('pt-BR')],
      ],
    ),
  );
  children.push(spacer());

  // Instruções (como no modelo) + entrega pelo Teams
  children.push(h1('Instruções'));
  children.push(
    p([
      run('Realize a atividade no laboratório em '),
      run(SITE_URL, { bold: true }),
      run('. Informe lá apenas o seu RA para receber o seu desafio. Este arquivo foi gerado pelo laboratório com as suas respostas; confira e complete o que faltar.'),
    ]),
  );
  children.push(p([run('Neste relatório, verifique ou preencha:')], 60));
  [
    ['Identificação:', 'RA e turma/período (não informe outros dados pessoais).'],
    ['Evidências:', 'prints da tela mostrando as operações executadas (cole nos quadros indicados).'],
    ['O que aconteceu:', 'de 3 a 5 linhas, com suas palavras.'],
    ['Perguntas:', 'as respostas do desafio e da atividade de proteção de dados.'],
    ['Conclusão:', 'o que você aprendeu com a atividade.'],
  ].forEach(([a, b]) => children.push(bullet(a, b)));
  children.push(
    p([
      run('Atenção: ', { bold: true }),
      run('a atividade é individual. Relatórios com RA de outra pessoa ou com respostas copiadas de colegas ou da internet serão considerados plágio e anulados. Use somente dados fictícios: nunca coloque seus dados pessoais reais.'),
    ]),
  );
  children.push(
    p([
      run('Como colar o print: ', { bold: true }),
      run('no Windows use Windows + Shift + S, selecione a área e cole (Ctrl + V) no quadro correspondente.'),
    ]),
  );
  children.push(p([run('Como entregar no Microsoft Teams:', { bold: true })], 60));
  [
    ['1.', 'Salve este arquivo com o nome relatorio-criptolab-SEU-RA.docx.'],
    ['2.', 'No Teams, abra a equipe da disciplina e vá em Tarefas.'],
    ['3.', 'Abra a tarefa "Laboratório de Criptografia".'],
    ['4.', 'Clique em "Adicionar trabalho" e envie este arquivo .docx (se o professor pedir, envie também o PDF).'],
    ['5.', 'Clique em "Entregar" e confira se o status mudou para entregue.'],
  ].forEach(([a, b]) => children.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 40 }, children: [run(`${a} `, { bold: true }), run(b)] })));
  children.push(spacer());

  // Resumo
  children.push(h1('Resumo da atividade'));
  (Object.keys(MODULE_REQUIREMENTS) as ModuleId[]).forEach((mId) => {
    const req = MODULE_REQUIREMENTS[mId];
    const done = req.filter((x) => state.milestones[x]).length;
    const pct = Math.round((done / req.length) * 100);
    const label = mId === 'relatorio' ? 'concluído (este relatório).' : pct === 100 ? 'concluído.' : pct > 0 ? `em andamento (${pct}%).` : 'não iniciado.';
    children.push(bullet(`${MODULE_LABEL[mId]}:`, label));
  });
  const techniques = [...new Set(state.log.map((l) => l.technique))];
  children.push(labeled('Técnicas utilizadas:', techniques.length ? techniques.join('; ') + '.' : 'nenhuma operação registrada.'));
  children.push(
    labeled(
      'Observação:',
      'AES-256-GCM, RSA-OAEP, SHA-256, PBKDF2 e a criptografia híbrida foram executados de verdade pela Web Crypto API. A Cifra de César, as demonstrações de DES, 3DES, DESX, Camellia, Blowfish, Twofish, SAFER e IDEA e a simulação de TLS são exemplos didáticos. Este relatório não contém chaves privadas nem segredos criptográficos.',
    ),
  );

  // Parte 1 — Desafio
  children.push(h1('Parte 1', true));
  children.push(h2(`Desafio por RA${r && r.ok ? ` — ${r.range.title}` : ''}`));
  if (r && r.ok) {
    children.push(box('Objetivo do desafio', CHALLENGES[r.range.id].objective), spacer());
  }
  children.push(box('Mensagem original de teste', ev.mensagem), spacer());
  children.push(box('Resultado da operação', ev.resultado), spacer());
  children.push(h3('Evidências'));
  state.attachments.forEach((a, i) => {
    let img: Uint8Array | null = null;
    try {
      img = dataUrlToBytes(a.dataUrl);
    } catch {
      img = null;
    }
    children.push(box(`Evidência ${i + 1}: ${a.caption || a.name}`, img ? { image: img } : null, 'Não foi possível incluir a imagem.'), spacer());
  });
  children.push(
    box('Print da tela: operação executada no laboratório.', null, 'Cole aqui o print da tela com o resultado da operação.', 3600),
    spacer(),
    box('O que aconteceu? Descreva com suas palavras.', ev.explicacao, 'Escreva aqui de 3 a 5 linhas.', 1400),
    spacer(),
  );
  if (r && r.ok)
    CHALLENGES[r.range.id].questions.forEach((q, i) =>
      children.push(box(`Pergunta ${i + 1}: ${q}`, state.answers[`desafio:${r.range.id}:q${i + 1}`] ?? '', 'Escreva aqui sua resposta.'), spacer()),
    );

  // Parte 2 — Proteção de dados
  children.push(h1('Parte 2', true));
  children.push(h2('Proteção de dados pessoais na prática'));
  children.push(
    p([run('Atividade realizada com um cadastro fictício (nome, telefone, RG e endereço), protegido com AES-256-GCM, SHA-256 e criptografia híbrida AES + RSA.')]),
  );
  children.push(box('Print da tela: tabela comparativa (Etapa 6).', null, 'Cole aqui o print da tabela comparativa.', 3600), spacer());
  Object.entries(STEP_QUESTIONS).forEach(([id, q], i) => children.push(box(`Etapa ${i + 1} — Pergunta: ${q}`, state.answers[id] ?? '', 'Escreva aqui sua resposta.'), spacer()));
  children.push(h3('Reflexão sobre segurança e LGPD'));
  LGPD_QUESTIONS.forEach((q, i) => children.push(box(`Pergunta ${i + 1}: ${q}`, state.answers[`lgpd:q${i + 1}`] ?? '', 'Escreva aqui sua resposta.'), spacer()));

  // Parte 3 — Registro
  children.push(h1('Parte 3', true));
  children.push(h2('Registro das operações'));
  children.push(p([run('Operações registradas automaticamente pelo laboratório (mais recentes primeiro, até 40).')]));
  const ops = [...state.log].reverse().slice(0, 40);
  children.push(
    twoColTable(
      ['Hora · técnica', 'Operação e resultado'],
      ops.length
        ? ops.map((l) => [
            `${new Date(l.time).toLocaleTimeString('pt-BR')} · ${l.technique}`,
            `${l.action}${l.ok ? '' : ' (falhou)'}${l.output ? `\nResultado: ${l.output}` : ''}`,
          ])
        : [['-', 'Nenhuma operação registrada.']],
      3000,
    ),
  );

  // Parte 4 — Conclusão
  children.push(h1('Parte 4'));
  children.push(h2('Dificuldades e conclusão'));
  children.push(box('Dificuldades encontradas', ev.dificuldades, 'Escreva aqui.'), spacer());
  children.push(box('Conclusão do estudante', ev.conclusao, 'Escreva aqui.', 1400), spacer());

  // Referências
  children.push(h1('Referências'));
  REFERENCES.forEach((ref) =>
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [run(ref.before), run(ref.bold, { bold: true }), run(referenceText(ref).slice(ref.before.length + ref.bold.length))],
      }),
    ),
  );

  const section: ISectionOptions = {
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Laboratório Interativo de Criptografia · RA ${ev.ra || state.ra || '-'} · Página `, font: FONT, size: 16, color: COLOR.placeholder }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLOR.placeholder }),
            ],
          }),
        ],
      }),
    },
    children,
  };

  return new Document({
    creator: 'CriptoLab',
    title: 'Relatório de entrega — Laboratório Interativo de Criptografia',
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: COLOR.title } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 28, bold: true, color: COLOR.title }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: COLOR.h1 }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: COLOR.title }, paragraph: { spacing: { before: 120, after: 160 }, keepNext: true, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, color: COLOR.h3 }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }],
    },
    sections: [section],
  });
}

export function reportDocxFilename(state: LabState, d = new Date()): string {
  const ra = (state.evidence.ra || state.ra).replace(/\D/g, '') || 'sem-ra';
  return `relatorio-criptolab-${ra}-${d.toISOString().slice(0, 10)}.docx`;
}
