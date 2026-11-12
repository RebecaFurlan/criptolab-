import { describe, expect, it } from 'vitest';
import { caesarBruteForce, caesarDecrypt, caesarEncrypt, toyFeistel, toyFeistelText } from '../lib/classic';
import { resolveRa } from '../lib/ra';
import { DEFAULT_RECORD, generateFakeRecord, mutateOneDigit, recordToText } from '../lib/fakeData';
import { redactSecrets } from '../store';
import { changeOneLetter } from '../components/tools/ShaTool';

describe('Cifra de César', () => {
  it('desloca letras e preserva o restante', () => {
    expect(caesarEncrypt('ABC xyz!', 3)).toBe('DEF abc!');
    expect(caesarDecrypt('DEF abc!', 3)).toBe('ABC xyz!');
    expect(caesarEncrypt('ATAQUE', 29)).toBe(caesarEncrypt('ATAQUE', 3));
    expect(caesarEncrypt('ATAQUE', -1)).toBe('ZSZPTD');
    expect(caesarEncrypt('ação', 1)).toBe('bçãp');
  });
  it('força bruta encontra o texto original', () => {
    const c = caesarEncrypt('SEGREDO', 11);
    expect(caesarBruteForce(c).find((r) => r.shift === 11)?.text).toBe('SEGREDO');
    expect(caesarBruteForce(c)).toHaveLength(25);
  });
});

describe('Rede de Feistel de brinquedo', () => {
  it('decifrar com subchaves invertidas recupera todos os blocos', () => {
    for (let block = 0; block < 65536; block += 97) {
      for (const key of [0, 77, 255]) {
        const { output } = toyFeistel(block, key, 4);
        expect(toyFeistel(output, key, 4, true).output).toBe(block);
      }
    }
    expect(toyFeistelText('LAB', 77)).toHaveLength(4);
  });
});

describe('Identificação do desafio pelo RA', () => {
  const cases: [string, string][] = [
    ['2026000100', 'arquivos'],
    ['123419', 'arquivos'],
    ['123420', 'integridade'],
    ['99939', 'integridade'],
    ['40', 'assimetrica'],
    ['1059', 'assimetrica'],
    ['560', 'tls'],
    ['12.345.679', 'tls'],
    ['880', 'armazenados'],
    ['0099', 'armazenados'],
    ['12.345.678-1', 'armazenados'],
  ];
  it.each(cases)('RA %s → %s', (ra, id) => {
    const r = resolveRa(ra);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.range.id).toBe(id);
  });
  it('rejeita entradas inválidas', () => {
    expect(resolveRa('').ok).toBe(false);
    expect(resolveRa('7').ok).toBe(false);
    expect(resolveRa('<script>').ok).toBe(false);
    expect(resolveRa('1'.repeat(40)).ok).toBe(false);
  });
});

describe('Dados fictícios', () => {
  it('gera cadastro com formato esperado e identificado como fictício', () => {
    for (let i = 0; i < 50; i++) {
      const r = generateFakeRecord();
      expect(r.telefone).toMatch(/^\(11\) 99999-\d{4}$/);
      expect(r.rg).toMatch(/^\d{2}\.\d{3}\.\d{3}-\d$/);
      expect(r.email).toMatch(/\.teste@email\.com$/);
      expect(recordToText(r)).toContain('[DADOS FICTÍCIOS]');
    }
    expect(DEFAULT_RECORD.nome).toBe('Mariana Oliveira Santos');
  });
  it('altera exatamente um dígito do RG', () => {
    for (let i = 0; i < 50; i++) {
      const m = mutateOneDigit('45.678.912-3');
      const diff = [...m].filter((c, j) => c !== '45.678.912-3'[j]).length;
      expect(diff).toBe(1);
      expect(m).toMatch(/^\d{2}\.\d{3}\.\d{3}-\d$/);
    }
  });
  it('altera uma letra do texto', () => {
    expect(changeOneLetter('abc')).not.toBe('abc');
    expect(changeOneLetter('abc')).toHaveLength(3);
  });
});

describe('Proteção de segredos no registro', () => {
  it('remove chaves privadas PEM e JWK', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----';
    expect(redactSecrets(`x ${pem} y`)).toBe('x [CHAVE PRIVADA OMITIDA] y');
    expect(redactSecrets('{"kty":"RSA","d":"abc123"}')).not.toContain('abc123');
  });
});
