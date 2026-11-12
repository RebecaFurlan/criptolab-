// Gerador de cadastros FICTÍCIOS para a atividade de proteção de dados.
// Nenhum dado real é solicitado ou utilizado.

export interface FakeRecord {
  nome: string;
  telefone: string;
  rg: string;
  endereco: string;
  email: string;
}

const FIRST = ['Mariana', 'Lucas', 'Beatriz', 'Rafael', 'Camila', 'Gustavo', 'Larissa', 'Thiago', 'Juliana', 'Felipe', 'Aline', 'Bruno'];
const MIDDLE = ['Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Almeida', 'Ribeiro', 'Martins'];
const LAST = ['Santos', 'Silva', 'Ferreira', 'Rodrigues', 'Gomes', 'Carvalho', 'Araújo', 'Barbosa'];
const STREETS = ['Rua das Flores', 'Avenida dos Ipês', 'Rua do Laboratório', 'Travessa das Acácias', 'Rua dos Girassóis', 'Alameda das Palmeiras'];
const CITIES = ['São Paulo', 'Campinas', 'Santos', 'Sorocaba', 'Ribeirão Preto', 'São José dos Campos'];

export const DEFAULT_RECORD: FakeRecord = {
  nome: 'Mariana Oliveira Santos',
  telefone: '(11) 99999-1234',
  rg: '45.678.912-3',
  endereco: 'Rua das Flores, 150 – São Paulo',
  email: 'mariana.teste@email.com',
};

const pick = <T,>(arr: T[], rnd: () => number) => arr[Math.floor(rnd() * arr.length)];
const digits = (n: number, rnd: () => number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Gera um novo cadastro fictício. O telefone usa o prefixo 99999 e o e-mail termina em "teste@email.com". */
export function generateFakeRecord(rnd: () => number = Math.random): FakeRecord {
  const first = pick(FIRST, rnd);
  const nome = `${first} ${pick(MIDDLE, rnd)} ${pick(LAST, rnd)}`;
  const rgDigits = digits(8, rnd);
  return {
    nome,
    telefone: `(11) 99999-${digits(4, rnd)}`,
    rg: `${rgDigits.slice(0, 2)}.${rgDigits.slice(2, 5)}.${rgDigits.slice(5, 8)}-${digits(1, rnd)}`,
    endereco: `${pick(STREETS, rnd)}, ${10 + Math.floor(rnd() * 990)} – ${pick(CITIES, rnd)}`,
    email: `${strip(first)}.teste@email.com`,
  };
}

export const recordToText = (r: FakeRecord) =>
  [`Nome: ${r.nome}`, `Telefone: ${r.telefone}`, `RG: ${r.rg}`, `Endereço: ${r.endereco}`, `E-mail: ${r.email}`, '[DADOS FICTÍCIOS]'].join('\n');

/** Altera um único dígito do RG (usado na etapa do hash). */
export function mutateOneDigit(rg: string, rnd: () => number = Math.random): string {
  const positions = [...rg].map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
  const pos = positions[Math.floor(rnd() * positions.length)];
  const old = Number(rg[pos]);
  const next = (old + 1 + Math.floor(rnd() * 9)) % 10;
  return rg.slice(0, pos) + String(next) + rg.slice(pos + 1);
}
