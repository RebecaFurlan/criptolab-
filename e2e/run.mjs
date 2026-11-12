import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173/';
const OUT = './e2e/shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const external = [];
const errors = [];
page.on('request', (r) => {
  const u = new URL(r.url());
  if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) external.push(r.url());
});
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
};
const go = async (r) => {
  await page.goto(`${BASE}#${r}`);
  await page.waitForTimeout(250);
};
const shot = (n, full = true) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
const clickBtn = async (name, opts = {}) => {
  await page.getByRole('button', { name, exact: opts.exact ?? false }).first().click();
  await page.waitForTimeout(opts.wait ?? 400);
};
const has = async (text) => (await page.getByText(text, { exact: false }).count()) > 0;

// Início
await go('inicio');
await shot('01-inicio');
check('Início carrega', await has('Laboratório Interativo'));

// Introdução
await go('introducao');
await page.locator('#intro-guess').fill('3');
await page.waitForTimeout(200);
check('Intro: chave correta recupera texto', await has('Texto original recuperado'));
for (const opt of ['…a mesma chave cifra e decifra.', 'Não: o hash é de mão única.', 'A chave pública de Ana.', 'Integridade']) {
  await page.getByRole('button', { name: opt, exact: true }).click();
}
await clickBtn('Registrar conclusão do teste');
await shot('02-intro');

// Algoritmos
await go('algoritmos');
for (const id of ['DES', '3DES', 'DESX', 'IDEA', 'SAFER', 'Camellia']) {
  await page.getByRole('tab').filter({ hasText: new RegExp(`^\\d+${id}`) }).first().click();
  await page.waitForTimeout(120);
}
await page.getByRole('tab').filter({ hasText: /^\d+DES/ }).first().click();
await clickBtn('Executar demonstração');
check('Algoritmos: demonstração conceitual identificada', await has('Demonstração conceitual — não é criptografia real'));
await shot('03-algoritmos');

// Simulações
await go('simulacoes');
await clickBtn('Criptografar', { exact: true });
check('César: resultado', await has('DWDTXH DR DPDQKHFHU'));
await page.getByRole('tab', { name: 'B. AES-256-GCM' }).click(); await page.waitForTimeout(300);
await clickBtn('Gerar chave', { exact: true });
await clickBtn('Criptografar', { exact: true });
await clickBtn('Descriptografar', { exact: true });
check('AES: descriptografia idêntica', await has('idêntico ao texto original'));
await clickBtn('Adulterar 1 bit');
await clickBtn('Descriptografar', { exact: true });
check('AES: adulteração rejeitada', await has('Resultado esperado'));
await shot('04-aes');
await page.getByRole('tab', { name: 'C. RSA-OAEP' }).click(); await page.waitForTimeout(300);
await clickBtn('Gerar par de chaves', { wait: 3000 });
check('RSA: chave pública PEM', await has('BEGIN PUBLIC KEY'));
check('RSA: chave privada oculta por padrão', !(await has('BEGIN PRIVATE KEY')));
await clickBtn('Criptografar com a chave pública');
await clickBtn('Descriptografar com a chave privada');
check('RSA: mensagem recuperada', await has('Mensagem recuperada com a CHAVE PRIVADA'));
await page.locator('#rsa-simulacoes').fill('x'.repeat(200));
await page.waitForTimeout(150);
check('RSA: limite de tamanho avisado', await has('Mensagem acima do limite'));
await shot('05-rsa');
await page.getByRole('tab', { name: 'D. SHA-256' }).click(); await page.waitForTimeout(300);
await clickBtn('Gerar hash SHA-256');
await clickBtn('Gerar novo hash');
check('SHA: comparação de hashes', await has('de 256 bits mudaram'));
await shot('06-sha');

// Desafios: percorrer as 5 faixas
const raCases = [
  ['2026000110', 'Proteção de arquivos'],
  ['2026000125', 'Integridade de documentos'],
  ['2026000145', 'Criptografia assimétrica'],
  ['2026000165', 'Comunicação segura'],
  ['2026000185', 'Proteção de dados armazenados'],
];
for (const [ra, title] of raCases) {
  await go('desafios');
  await page.locator('#ra').fill(ra);
  await clickBtn('Identificar desafio');
  check(`RA ${ra} → ${title}`, await has(`Desafio: ${title}`));
  if (title === 'Proteção de arquivos') {
    await clickBtn('Gerar arquivo de teste');
    await clickBtn('Gerar chave AES');
    await clickBtn('Criptografar arquivo');
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Baixar .*\.clab/ }).click();
    const d = await dl;
    check('Arquivo: download .clab', d.suggestedFilename().endsWith('.clab'));
    await clickBtn('Descriptografar', { exact: true });
    check('Arquivo: hash idêntico', await has('hash SHA-256 é idêntico'));
    await shot('07-desafio-arquivos');
  }
  if (title === 'Integridade de documentos') {
    await clickBtn('1. Registrar hash');
    await clickBtn('3. Verificar integridade');
    await clickBtn('2. Simular adulteração');
    await clickBtn('3. Verificar integridade');
    check('Integridade: adulteração detectada', await has('ALTERAÇÃO DETECTADA'));
    await shot('08-desafio-integridade');
  }
  if (title === 'Criptografia assimétrica') {
    await clickBtn('Gerar par de chaves', { wait: 3000 });
    await clickBtn('Criptografar com a chave pública');
    await clickBtn('Descriptografar com a chave privada');
    await clickBtn('Tentar com outra chave privada', { wait: 3000 });
    check('RSA desafio: outra chave falha', await has('Resultado esperado'));
  }
  if (title === 'Comunicação segura') {
    for (const s of ['ClientHello', 'ServerHello', 'Verificar certificado', 'Derivar chave de sessão']) await clickBtn(s, { wait: 600 });
    check('TLS: mesma chave de sessão', await has('MESMA chave de sessão'));
    await clickBtn('Enviar', { exact: true });
    await clickBtn('Intruso altera o último pacote');
    check('TLS: pacote adulterado rejeitado', await has('REJEITOU'));
    check('TLS: aviso de simulação', await has('nenhuma conexão TLS real é'));
    await page.getByRole('button', { name: 'Mostrar', exact: true }).click();
    await shot('09-desafio-tls');
  }
  if (title === 'Proteção de dados armazenados') {
    await clickBtn('Cifrar e gravar no banco', { wait: 2500 });
    await clickBtn('Ler como aplicativo autorizado', { wait: 2500 });
    check('Banco: leitura autorizada', await has('recuperou os dados originais'));
    await clickBtn('Invasor tenta ler o banco', { wait: 2500 });
    check('Banco: invasor falha', await has('Resultado esperado'));
    for (let i = 1; i <= 3; i++) await page.locator(`#q-desafio\\:armazenados\\:q${i}`).fill(`Resposta de teste número ${i} do estudante.`);
    await clickBtn('Enviar resultado para Evidências');
    check('Banco: resultado enviado às evidências', page.url().includes('evidencias'));
  }
}

// Proteção de dados
await go('protecao');
check('Proteção: dados marcados como fictícios', await has('FICTÍCIO'));
await page.locator('#algo').selectOption('AES-256-GCM');
await clickBtn('3. Criptografar');
await clickBtn('5. Descriptografar');
check('Etapa 1: comparação idêntica', await has('IDÊNTICO ao original'));
// Etapa 2 e 4 pelos botões do painel (desktop)
const rowBtn = async (campo, name) => {
  await page.locator('table tr', { hasText: campo }).first().getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(300);
};
await rowBtn('Telefone', 'Criptografar');
await rowBtn('Endereço', 'Criptografar');
await rowBtn('Endereço', 'Descriptografar');
await page.locator('#etapa-3').getByRole('button', { name: 'Gerar hash SHA-256' }).click();
await page.waitForTimeout(300);
await page.locator('#etapa-3').getByRole('button', { name: 'Gerar novo hash' }).click();
await page.waitForTimeout(300);
check('Etapa 3: hashes comparados', await has('de 256 bits mudaram'));
for (let i = 1; i <= 6; i++) {
  const b = page.locator('#etapa-5 button').filter({ hasText: /./ }).nth(i - 1);
  await b.click();
  await page.waitForTimeout(i === 3 ? 3000 : 500);
}
check('Etapa 5: cadastro recuperado pela híbrida', await has('Cadastro recuperado integralmente'));
await clickBtn('Gerar comparação');
check('Etapa 6: tabela comparativa', await has('Possibilidade de recuperação'));
for (let i = 1; i <= 7; i++) await page.locator(`#q-lgpd\\:q${i}`).fill(`Resposta de reflexão número ${i} sobre a LGPD.`);
for (let i = 1; i <= 5; i++) await page.locator(`#q-prot\\:q${i}`).fill(`Resposta da etapa ${i}.`);
await page.waitForTimeout(300);
check('Etapa 7: texto da LGPD sobre dados sensíveis', await has('não são automaticamente classificados como dados pessoais'));
await shot('10-protecao');

// Evidências
await go('evidencias');
await page.locator('#ev-explicacao').fill('O dado ficou ilegível sem a chave.');
await page.locator('#ev-dificuldades').fill('Entender o IV.');
await page.locator('#ev-conclusao').fill('Criptografia protege, hash verifica.');
// anexo de imagem (captura da própria página)
await page.screenshot({ path: '/tmp/evid.png' });
await page.locator('input[type=file]').first().setInputFiles('/tmp/evid.png');
await page.waitForTimeout(800);
check('Evidências: anexo exibido', (await page.locator('img[alt]').count()) > 0);
check('Evidências: completo', await has('Completo'));
await shot('11-evidencias');

// Relatório
await go('relatorio');
const dl = page.waitForEvent('download');
await clickBtn('Gerar relatório PDF', { wait: 1500 });
const d = await dl;
const pdfPath = `${OUT}/relatorio.pdf`;
await d.saveAs(pdfPath);
const pdf = fs.readFileSync(pdfPath).toString('latin1');
check('PDF gerado', pdf.startsWith('%PDF'), d.suggestedFilename());
check('PDF sem chave privada', !pdf.includes('PRIVATE KEY'));
await go('inicio');
const pct = await page.locator('[role=progressbar]').first().getAttribute('aria-valuenow');
check('Progresso geral 100%', pct === '100', `${pct}%`);
await shot('12-inicio-final');
await go('referencias');
await shot('13-referencias');

// Celular
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push('mobile: ' + e));
for (const r of ['inicio', 'protecao', 'simulacoes', 'desafios']) {
  await mp.goto(`${BASE}#${r}`);
  await mp.waitForTimeout(300);
  await mp.screenshot({ path: `${OUT}/m-${r}.png`, fullPage: r !== 'protecao' });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`Celular ${r}: sem rolagem horizontal`, overflow <= 1, `${overflow}px`);
}
await mp.getByRole('button', { name: 'Abrir menu' }).click();
await mp.waitForTimeout(200);
await mp.screenshot({ path: `${OUT}/m-menu.png` });
check('Celular: menu abre', (await mp.getByRole('dialog').count()) === 1);

check('Nenhuma requisição externa', external.length === 0, external.slice(0, 5).join(', '));
check('Sem erros no console', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} verificações aprovadas`);
await browser.close();
