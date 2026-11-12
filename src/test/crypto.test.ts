import { describe, expect, it } from 'vitest';
import {
  aesDecrypt,
  aesEncrypt,
  deriveAesKeyFromPassword,
  deriveSessionKey,
  ecdsaSign,
  ecdsaVerify,
  exportPrivatePem,
  exportPublicPem,
  exportRawKey,
  generateAesKey,
  generateEcdhKeyPair,
  generateEcdsaKeyPair,
  generateRsaKeyPair,
  hybridDecrypt,
  hybridEncrypt,
  keyFingerprint,
  packEncryptedFile,
  randomBytes,
  rsaDecrypt,
  rsaEncrypt,
  rsaOaepMaxBytes,
  sha256Hex,
  unpackEncryptedFile,
  unwrapAesKey,
  deserializeHybrid,
  serializeHybrid,
} from '../lib/crypto';
import { bitDifference, fromHex, fromUtf8, toHex, utf8 } from '../lib/encoding';

describe('AES-256-GCM', () => {
  it('cifra e decifra (ida e volta) com chave de 256 bits e IV de 96 bits', async () => {
    const key = await generateAesKey();
    expect((await exportRawKey(key)).length).toBe(32);
    const r = await aesEncrypt(key, 'Mariana Oliveira Santos');
    expect(r.iv.length).toBe(12);
    expect(r.ciphertext.length).toBe(utf8('Mariana Oliveira Santos').length + 16);
    expect(fromUtf8(await aesDecrypt(key, r.iv, r.ciphertext))).toBe('Mariana Oliveira Santos');
  });

  it('gera textos cifrados diferentes para a mesma mensagem (IV aleatório)', async () => {
    const key = await generateAesKey();
    const a = await aesEncrypt(key, 'igual');
    const b = await aesEncrypt(key, 'igual');
    expect(toHex(a.ciphertext)).not.toBe(toHex(b.ciphertext));
  });

  it('rejeita texto cifrado adulterado (etiqueta GCM)', async () => {
    const key = await generateAesKey();
    const r = await aesEncrypt(key, 'dado íntegro');
    r.ciphertext[0] ^= 1;
    await expect(aesDecrypt(key, r.iv, r.ciphertext)).rejects.toThrow(/Falha na descriptografia/);
  });

  it('rejeita chave errada', async () => {
    const r = await aesEncrypt(await generateAesKey(), 'segredo');
    await expect(aesDecrypt(await generateAesKey(), r.iv, r.ciphertext)).rejects.toThrow();
  });

  it('confere com vetor de teste conhecido (chave e IV zerados, texto vazio)', async () => {
    // Vetor do GCM (McGrew & Viega), caso 13: AES-256, K=0, IV=0, P vazio -> tag 530f8afbc74536b9a963b4f1c4cb738b
    const raw = new Uint8Array(32);
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    const r = await aesEncrypt(key, new Uint8Array(0), new Uint8Array(12));
    expect(toHex(r.ciphertext)).toBe('530f8afbc74536b9a963b4f1c4cb738b');
  });

  it('empacota e desempacota arquivos .clab', async () => {
    const key = await generateAesKey();
    const r = await aesEncrypt(key, randomBytes(5000));
    const packed = packEncryptedFile(r);
    const u = unpackEncryptedFile(packed);
    expect(toHex(u.iv)).toBe(toHex(r.iv));
    expect((await aesDecrypt(key, u.iv, u.ciphertext)).length).toBe(5000);
    expect(() => unpackEncryptedFile(utf8('XXXX123'))).toThrow(/cabeçalho/);
  });

  it('impressão digital não revela a chave', async () => {
    const key = await generateAesKey();
    const fp = await keyFingerprint(key);
    expect(fp).toMatch(/^([0-9a-f]{2}:){7}[0-9a-f]{2}$/);
    expect(toHex(await exportRawKey(key))).not.toContain(fp.replace(/:/g, ''));
  });
});

describe('PBKDF2 -> AES', () => {
  it('mesma senha + salt = mesma chave; senha diferente falha', async () => {
    const salt = randomBytes(16);
    const k1 = await deriveAesKeyFromPassword('frase-de-teste', salt, 1000);
    const k2 = await deriveAesKeyFromPassword('frase-de-teste', salt, 1000);
    const k3 = await deriveAesKeyFromPassword('123456', salt, 1000);
    const r = await aesEncrypt(k1, 'registro');
    expect(fromUtf8(await aesDecrypt(k2, r.iv, r.ciphertext))).toBe('registro');
    await expect(aesDecrypt(k3, r.iv, r.ciphertext)).rejects.toThrow();
  });
});

describe('RSA-OAEP', () => {
  it('gera par de 2048 bits, cifra com a pública e decifra com a privada', async () => {
    const kp = await generateRsaKeyPair();
    expect((kp.publicKey.algorithm as RsaHashedKeyAlgorithm).modulusLength).toBe(2048);
    const pub = await exportPublicPem(kp.publicKey);
    const priv = await exportPrivatePem(kp.privateKey);
    expect(pub).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(priv).toMatch(/^-----BEGIN PRIVATE KEY-----/);
    expect(pub).not.toBe(priv);
    const ct = await rsaEncrypt(kp.publicKey, 'mensagem curta');
    expect(ct.length).toBe(256);
    expect(fromUtf8(await rsaDecrypt(kp.privateKey, ct))).toBe('mensagem curta');
  });

  it('respeita o limite de 190 bytes (k - 2hLen - 2)', async () => {
    expect(rsaOaepMaxBytes(2048, 32)).toBe(190);
    const kp = await generateRsaKeyPair();
    await expect(rsaEncrypt(kp.publicKey, 'a'.repeat(190))).resolves.toHaveLength(256);
    await expect(rsaEncrypt(kp.publicKey, 'a'.repeat(191))).rejects.toThrow(/grande demais/);
  });

  it('falha com outra chave privada', async () => {
    const a = await generateRsaKeyPair();
    const b = await generateRsaKeyPair();
    const ct = await rsaEncrypt(a.publicKey, 'oi');
    await expect(rsaDecrypt(b.privateKey, ct)).rejects.toThrow(/não corresponde/);
  });
});

describe('SHA-256', () => {
  it('confere com os vetores da FIPS 180-4', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('efeito avalanche: alterar um dígito do RG muda cerca de metade dos bits', async () => {
    const a = fromHex(await sha256Hex('45.678.912-3'));
    const b = fromHex(await sha256Hex('45.678.912-4'));
    const d = bitDifference(a, b);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(176);
  });
});

describe('Criptografia híbrida AES + RSA', () => {
  it('protege a chave AES com RSA e recupera o cadastro completo', async () => {
    const rsa = await generateRsaKeyPair();
    const cadastro = 'Nome: X\nTelefone: (11) 99999-0000\n'.repeat(20); // maior que 190 bytes
    expect(utf8(cadastro).length).toBeGreaterThan(190);
    const aes = await generateAesKey();
    const pkg = await hybridEncrypt(rsa.publicKey, cadastro, aes);
    expect(pkg.wrappedKey.length).toBe(256);
    const recovered = await unwrapAesKey(rsa.privateKey, pkg.wrappedKey);
    expect(await keyFingerprint(recovered)).toBe(await keyFingerprint(aes));
    expect(fromUtf8(await hybridDecrypt(rsa.privateKey, deserializeHybrid(serializeHybrid(pkg))))).toBe(cadastro);
  });

  it('não recupera com chave privada errada', async () => {
    const a = await generateRsaKeyPair();
    const b = await generateRsaKeyPair();
    const pkg = await hybridEncrypt(a.publicKey, 'dados');
    await expect(hybridDecrypt(b.privateKey, pkg)).rejects.toThrow();
  });
});

describe('Primitivas da simulação de TLS', () => {
  it('ECDH + HKDF: cliente e servidor derivam a mesma chave de sessão', async () => {
    const c = await generateEcdhKeyPair();
    const s = await generateEcdhKeyPair();
    const salt = randomBytes(32);
    const kc = await deriveSessionKey(c.privateKey, s.publicKey, salt);
    const ks = await deriveSessionKey(s.privateKey, c.publicKey, salt);
    expect(toHex(kc.sharedSecret)).toBe(toHex(ks.sharedSecret));
    expect(await keyFingerprint(kc.key)).toBe(await keyFingerprint(ks.key));
    const msg = await aesEncrypt(kc.key, 'olá servidor');
    expect(fromUtf8(await aesDecrypt(ks.key, msg.iv, msg.ciphertext))).toBe('olá servidor');
  });

  it('ECDSA: assinatura válida e detecção de alteração', async () => {
    const k = await generateEcdsaKeyPair();
    const data = utf8('transcript');
    const sig = await ecdsaSign(k.privateKey, data);
    expect(await ecdsaVerify(k.publicKey, sig, data)).toBe(true);
    expect(await ecdsaVerify(k.publicKey, sig, utf8('transcripT'))).toBe(false);
  });
});
