// Cifras e demonstrações DIDÁTICAS (sem segurança real).

/** Cifra de César: desloca apenas as letras A–Z / a–z. Outros caracteres são mantidos. */
export function caesar(text: string, shift: number): string {
  const s = (((Math.trunc(shift) % 26) + 26) % 26);
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base);
  });
}

export const caesarEncrypt = (text: string, shift: number) => caesar(text, shift);
export const caesarDecrypt = (text: string, shift: number) => caesar(text, -shift);

/** Força bruta: testa os 25 deslocamentos possíveis (mostra como o espaço de chaves é pequeno). */
export function caesarBruteForce(cipher: string): { shift: number; text: string }[] {
  return Array.from({ length: 25 }, (_, i) => ({ shift: i + 1, text: caesarDecrypt(cipher, i + 1) }));
}

/** Indica se o texto contém letras acentuadas/ç, que a cifra de César clássica não altera. */
export const hasNonAsciiLetters = (text: string) => /[À-ÿ]/.test(text);

/* ------------------------------------------------------------------ */
/* Rede de Feistel de BRINQUEDO — demonstração conceitual              */
/* Usa blocos de 16 bits e uma função de rodada simples.                */
/* NÃO é DES, Blowfish, Camellia nem qualquer algoritmo real.          */
/* ------------------------------------------------------------------ */

export interface FeistelRound {
  round: number;
  left: number;
  right: number;
  subkey: number;
  f: number;
}

const rotl8 = (x: number, r: number) => ((x << r) | (x >>> (8 - r))) & 0xff;
const toyF = (half: number, subkey: number) => rotl8((half ^ subkey) & 0xff, 3) ^ ((half * 7) & 0xff);

export function toySubkeys(key: number, rounds: number): number[] {
  return Array.from({ length: rounds }, (_, i) => rotl8((key + i * 0x3b) & 0xff, (i % 7) + 1));
}

/** Cifra um bloco de 16 bits (2 bytes) com uma rede de Feistel de brinquedo e devolve as rodadas. */
export function toyFeistel(block: number, key: number, rounds = 4, decrypt = false): { output: number; trace: FeistelRound[] } {
  let L = (block >> 8) & 0xff;
  let R = block & 0xff;
  const keys = toySubkeys(key, rounds);
  const order = decrypt ? [...keys].reverse() : keys;
  const trace: FeistelRound[] = [{ round: 0, left: L, right: R, subkey: 0, f: 0 }];
  order.forEach((k, i) => {
    const f = toyF(R, k);
    const newL = R;
    const newR = L ^ f;
    L = newL;
    R = newR;
    trace.push({ round: i + 1, left: L, right: R, subkey: k, f });
  });
  // troca final (como nas redes de Feistel clássicas) para que a decifração use a mesma estrutura
  const output = ((R << 8) | L) & 0xffff;
  return { output, trace };
}

export function toyFeistelText(text: string, key: number, rounds = 4, decrypt = false): number[] {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length % 2) bytes.push(0);
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const { output } = toyFeistel((bytes[i] << 8) | bytes[i + 1], key, rounds, decrypt);
    out.push(output >> 8, output & 0xff);
  }
  return out;
}

/** XOR "branqueamento" (ideia usada no DESX), aplicado byte a byte. Didático. */
export const xorBytes = (a: number[], k: number[]) => a.map((b, i) => b ^ k[i % k.length]);
