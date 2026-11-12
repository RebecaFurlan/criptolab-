// Operações criptográficas REAIS usando a Web Crypto API do navegador.
// Nenhum dado é enviado para servidores: tudo acontece localmente.

import { concatBytes, fromBase64, toBase64, toHex, utf8 } from './encoding';

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle;
  if (!s) {
    throw new Error(
      'A Web Crypto API não está disponível. Abra o laboratório em HTTPS (ou localhost) em um navegador atualizado.',
    );
  }
  return s;
};

export const isWebCryptoAvailable = (): boolean => Boolean(globalThis.crypto?.subtle);

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

type BytesLike = string | Uint8Array<ArrayBuffer>;
const asBytes = (data: BytesLike): Uint8Array<ArrayBuffer> => (typeof data === 'string' ? utf8(data) : data);

/* ------------------------------------------------------------------ */
/* AES-256-GCM                                                         */
/* ------------------------------------------------------------------ */

export const AES_IV_BYTES = 12; // 96 bits: tamanho recomendado de IV para o GCM
export const AES_TAG_BITS = 128;

export interface AesResult {
  iv: Uint8Array<ArrayBuffer>;
  /** Texto cifrado + etiqueta de autenticação (16 bytes no final). */
  ciphertext: Uint8Array<ArrayBuffer>;
}

export async function generateAesKey(extractable = true): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
}

export async function aesEncrypt(key: CryptoKey, data: BytesLike, iv?: Uint8Array<ArrayBuffer>): Promise<AesResult> {
  const nonce = iv ?? randomBytes(AES_IV_BYTES);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: nonce, tagLength: AES_TAG_BITS }, key, asBytes(data));
  return { iv: nonce, ciphertext: new Uint8Array(ct) };
}

export async function aesDecrypt(
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
  ciphertext: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv, tagLength: AES_TAG_BITS }, key, ciphertext);
    return new Uint8Array(pt);
  } catch {
    throw new Error(
      'Falha na descriptografia: a chave está incorreta ou o texto cifrado/IV foi alterado (a etiqueta de autenticação do GCM não confere).',
    );
  }
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().exportKey('raw', key));
}

/** "Impressão digital" curta de uma chave (SHA-256 dos bytes, 8 primeiros bytes). Não revela a chave. */
export async function keyFingerprint(key: CryptoKey): Promise<string> {
  const raw = await exportRawKey(key);
  const h = await sha256(raw);
  return toHex(h.slice(0, 8)).match(/.{2}/g)!.join(':');
}

/** Formato de "pacote" para salvar um arquivo cifrado: MAGIC(4) | IV(12) | ciphertext. */
const FILE_MAGIC = utf8('CLB1');

export function packEncryptedFile(r: AesResult): Uint8Array<ArrayBuffer> {
  return concatBytes(FILE_MAGIC, r.iv, r.ciphertext);
}

export function unpackEncryptedFile(bytes: Uint8Array<ArrayBuffer>): AesResult {
  const magic = bytes.slice(0, 4);
  if (magic.length < 4 || magic.some((b, i) => b !== FILE_MAGIC[i])) {
    throw new Error('Este arquivo não foi gerado pelo CriptoLab (cabeçalho inválido).');
  }
  if (bytes.length < 4 + AES_IV_BYTES + 16) throw new Error('Arquivo cifrado incompleto.');
  return { iv: bytes.slice(4, 4 + AES_IV_BYTES), ciphertext: bytes.slice(4 + AES_IV_BYTES) };
}

/* ------------------------------------------------------------------ */
/* PBKDF2 -> AES (dados armazenados protegidos por senha)              */
/* ------------------------------------------------------------------ */

export const PBKDF2_ITERATIONS = 600_000;

export async function deriveAesKeyFromPassword(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', utf8(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/* ------------------------------------------------------------------ */
/* RSA-OAEP                                                            */
/* ------------------------------------------------------------------ */

export const RSA_MODULUS_BITS = 2048;
export const RSA_HASH = 'SHA-256';

/** Tamanho máximo da mensagem no RSA-OAEP: k - 2*hLen - 2 (RFC 8017, seção 7.1.1). */
export function rsaOaepMaxBytes(modulusBits = RSA_MODULUS_BITS, hashBytes = 32): number {
  return modulusBits / 8 - 2 * hashBytes - 2;
}

export async function generateRsaKeyPair(modulusBits = RSA_MODULUS_BITS): Promise<CryptoKeyPair> {
  return subtle().generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: modulusBits,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: RSA_HASH,
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

export async function rsaEncrypt(publicKey: CryptoKey, data: BytesLike): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = asBytes(data);
  const max = rsaOaepMaxBytes((publicKey.algorithm as RsaHashedKeyAlgorithm).modulusLength);
  if (bytes.length > max) {
    throw new Error(
      `Mensagem grande demais para RSA-OAEP: ${bytes.length} bytes (máximo ${max} bytes com chave de ${(publicKey.algorithm as RsaHashedKeyAlgorithm).modulusLength} bits e SHA-256). Para volumes maiores, use criptografia híbrida (AES + RSA).`,
    );
  }
  return new Uint8Array(await subtle().encrypt({ name: 'RSA-OAEP' }, publicKey, bytes));
}

export async function rsaDecrypt(privateKey: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'RSA-OAEP' }, privateKey, data));
  } catch {
    throw new Error('Falha na descriptografia RSA: a chave privada não corresponde à chave pública usada, ou o texto cifrado foi alterado.');
  }
}

function toPem(der: ArrayBuffer, label: string): string {
  const b64 = toBase64(der).match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----`;
}

export async function exportPublicPem(key: CryptoKey): Promise<string> {
  return toPem(await subtle().exportKey('spki', key), 'PUBLIC KEY');
}

export async function exportPrivatePem(key: CryptoKey): Promise<string> {
  return toPem(await subtle().exportKey('pkcs8', key), 'PRIVATE KEY');
}

export async function exportPublicJwk(key: CryptoKey): Promise<JsonWebKey> {
  return subtle().exportKey('jwk', key);
}

/* ------------------------------------------------------------------ */
/* SHA-256                                                             */
/* ------------------------------------------------------------------ */

export async function sha256(data: BytesLike): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().digest('SHA-256', asBytes(data)));
}

export async function sha256Hex(data: BytesLike): Promise<string> {
  return toHex(await sha256(data));
}

/* ------------------------------------------------------------------ */
/* Criptografia híbrida: AES-256-GCM + RSA-OAEP                         */
/* ------------------------------------------------------------------ */

export interface HybridPackage {
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
  /** Chave AES protegida (cifrada) com a chave pública RSA. */
  wrappedKey: Uint8Array<ArrayBuffer>;
}

export async function hybridEncrypt(publicKey: CryptoKey, data: BytesLike, aesKey?: CryptoKey): Promise<HybridPackage> {
  const key = aesKey ?? (await generateAesKey(true));
  const { iv, ciphertext } = await aesEncrypt(key, data);
  const wrappedKey = new Uint8Array(await subtle().wrapKey('raw', key, publicKey, { name: 'RSA-OAEP' }));
  return { iv, ciphertext, wrappedKey };
}

export async function unwrapAesKey(privateKey: CryptoKey, wrappedKey: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  try {
    return await subtle().unwrapKey('raw', wrappedKey, privateKey, { name: 'RSA-OAEP' }, { name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
  } catch {
    throw new Error('Não foi possível recuperar a chave AES: a chave privada RSA não corresponde à chave pública usada.');
  }
}

export async function hybridDecrypt(privateKey: CryptoKey, pkg: HybridPackage): Promise<Uint8Array<ArrayBuffer>> {
  const key = await unwrapAesKey(privateKey, pkg.wrappedKey);
  return aesDecrypt(key, pkg.iv, pkg.ciphertext);
}

export function serializeHybrid(pkg: HybridPackage): string {
  return JSON.stringify(
    { alg: 'RSA-OAEP-256 + A256GCM', wrappedKey: toBase64(pkg.wrappedKey), iv: toBase64(pkg.iv), ciphertext: toBase64(pkg.ciphertext) },
    null,
    2,
  );
}

export function deserializeHybrid(json: string): HybridPackage {
  const o = JSON.parse(json);
  return { wrappedKey: fromBase64(o.wrappedKey), iv: fromBase64(o.iv), ciphertext: fromBase64(o.ciphertext) };
}

/* ------------------------------------------------------------------ */
/* Primitivas para a SIMULAÇÃO DIDÁTICA de TLS (não é TLS real)        */
/* ------------------------------------------------------------------ */

export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as Promise<CryptoKeyPair>;
}

export async function generateEcdsaKeyPair(): Promise<CryptoKeyPair> {
  return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
}

export async function exportRawPublic(key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().exportKey('raw', key));
}

export async function importEcdhPublic(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return subtle().importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

export async function ecdsaSign(privateKey: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data));
}

export async function ecdsaVerify(publicKey: CryptoKey, signature: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<boolean> {
  return subtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, data);
}

/** ECDH (P-256) + HKDF-SHA-256 -> chave de sessão AES-256-GCM. */
export async function deriveSessionKey(
  myPrivate: CryptoKey,
  peerPublic: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  info = 'CriptoLab simulacao didatica de TLS',
): Promise<{ key: CryptoKey; sharedSecret: Uint8Array<ArrayBuffer> }> {
  const bits = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: peerPublic }, myPrivate, 256));
  const hkdfBase = await subtle().importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  const key = await subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: utf8(info) },
    hkdfBase,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  return { key, sharedSecret: bits };
}
