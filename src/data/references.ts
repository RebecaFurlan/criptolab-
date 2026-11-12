// Referências organizadas conforme ABNT NBR 6023:2018.
// Data de acesso: data real de elaboração do material.

export const ACCESS_DATE = '12 nov. 2026';

export interface Reference {
  id: string;
  /** Chamada autor-data usada no texto, ex.: (NIST, 2001). */
  cite: string;
  /** Partes da referência: o trecho em `bold` é o elemento em destaque (título). */
  before: string;
  bold: string;
  after: string;
  url: string;
}

export const REFERENCES: Reference[] = [
  {
    id: 'brasil2018',
    cite: 'BRASIL, 2018',
    before: 'BRASIL. Lei nº 13.709, de 14 de agosto de 2018. ',
    bold: 'Lei Geral de Proteção de Dados Pessoais (LGPD)',
    after: '. Brasília, DF: Presidência da República, 2018.',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
  },
  {
    id: 'moriarty2016',
    cite: 'MORIARTY et al., 2016',
    before: 'MORIARTY, K. et al. ',
    bold: 'RFC 8017',
    after: ': PKCS #1: RSA Cryptography Specifications Version 2.2. [S. l.]: IETF, 2016.',
    url: 'https://www.rfc-editor.org/rfc/rfc8017.html',
  },
  {
    id: 'nist2001',
    cite: 'NIST, 2001',
    before: 'NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY (NIST). ',
    bold: 'FIPS PUB 197',
    after: ': Advanced Encryption Standard (AES). Gaithersburg: NIST, 2001. Atualização editorial: 2023.',
    url: 'https://csrc.nist.gov/pubs/fips/197/final',
  },
  {
    id: 'nist2015',
    cite: 'NIST, 2015',
    before: 'NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY (NIST). ',
    bold: 'FIPS PUB 180-4',
    after: ': Secure Hash Standard (SHS). Gaithersburg: NIST, 2015.',
    url: 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final',
  },
  {
    id: 'nist2020',
    cite: 'NIST, 2020',
    before: 'NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY (NIST). ',
    bold: 'SP 800-57 Part 1 Rev. 5',
    after: ': Recommendation for Key Management. Gaithersburg: NIST, 2020.',
    url: 'https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final',
  },
  {
    id: 'rescorla2018',
    cite: 'RESCORLA, 2018',
    before: 'RESCORLA, E. ',
    bold: 'RFC 8446',
    after: ': The Transport Layer Security (TLS) Protocol Version 1.3. [S. l.]: IETF, 2018.',
    url: 'https://www.rfc-editor.org/rfc/rfc8446.html',
  },
  {
    id: 'valid',
    cite: 'VALID CERTIFICADORA, [20--?]',
    before: 'VALID CERTIFICADORA. ',
    bold: 'Tipos de criptografia',
    after: ': conheça os 10 mais usados e como funciona cada um. [S. l.]: Valid Certificadora, [20--?].',
    url: 'https://validcertificadora.com.br/blogs/certificado-digital/tipos-de-criptografia-conheca-os-10-mais-usados-e-como-funciona-cada-um',
  },
];

export const referenceText = (r: Reference) =>
  `${r.before}${r.bold}${r.after} Disponível em: ${r.url}. Acesso em: ${ACCESS_DATE}.`;
