// Fichas dos 10 algoritmos estudados no Módulo 2.
// Seleção de algoritmos baseada em VALID CERTIFICADORA ([20--?]).

export type AlgoStatus = 'recomendado' | 'seguro-pouco-usado' | 'legado' | 'obsoleto';
export type DemoKind = 'aes' | 'rsa' | 'feistel' | 'ede' | 'whitening' | 'idea' | 'safer';

export interface Algorithm {
  id: string;
  name: string;
  fullName: string;
  category: 'Simétrica (cifra de bloco)' | 'Assimétrica (chave pública)';
  year: string;
  authors: string;
  working: string;
  keyType: string;
  block: string;
  purpose: string;
  applications: string[];
  status: AlgoStatus;
  statusText: string;
  example: string;
  /** "webcrypto" = executado de verdade no navegador; "conceitual" = apenas demonstração didática. */
  support: 'webcrypto' | 'conceitual';
  demo: DemoKind;
  cite?: string;
}

export const STATUS_LABEL: Record<AlgoStatus, string> = {
  recomendado: 'Recomendado hoje',
  'seguro-pouco-usado': 'Seguro, mas pouco usado',
  legado: 'Legado — evitar em novos sistemas',
  obsoleto: 'Obsoleto / inseguro',
};

export const ALGORITHMS: Algorithm[] = [
  {
    id: 'des',
    name: 'DES',
    fullName: 'Data Encryption Standard',
    category: 'Simétrica (cifra de bloco)',
    year: '1977',
    authors: 'IBM, padronizado pelo NBS/NIST (EUA)',
    working:
      'Divide a mensagem em blocos de 64 bits e aplica 16 rodadas de uma rede de Feistel: em cada rodada, metade do bloco passa por uma função com uma subchave e o resultado é combinado (XOR) com a outra metade.',
    keyType: 'Chave secreta única de 56 bits efetivos (64 bits com paridade)',
    block: '64 bits',
    purpose: 'Confidencialidade de dados (histórico).',
    applications: ['Sistemas bancários e governamentais antigos', 'Base de estudo para cifras de bloco'],
    status: 'obsoleto',
    statusText:
      'A chave de 56 bits é pequena demais: já foi quebrada por força bruta em público no fim dos anos 1990. NÃO deve ser escolhido para proteger novos sistemas.',
    example: 'Veja abaixo uma rede de Feistel de brinquedo com 4 rodadas — a mesma ideia estrutural do DES, em escala mínima.',
    support: 'conceitual',
    demo: 'feistel',
  },
  {
    id: '3des',
    name: '3DES',
    fullName: 'Triple DES (TDEA)',
    category: 'Simétrica (cifra de bloco)',
    year: '1998–1999',
    authors: 'Extensão do DES padronizada pelo NIST/ANSI',
    working:
      'Aplica o DES três vezes em cada bloco, no esquema Cifrar–Decifrar–Cifrar (E-D-E) com duas ou três chaves diferentes, para aumentar o tamanho efetivo da chave.',
    keyType: 'Chave secreta de 112 ou 168 bits nominais (2 ou 3 chaves DES)',
    block: '64 bits',
    purpose: 'Prolongar a vida útil do DES em sistemas legados.',
    applications: ['Sistemas de pagamento antigos', 'Equipamentos legados'],
    status: 'obsoleto',
    statusText:
      'É lento e herda o bloco de 64 bits do DES, o que o torna vulnerável quando grandes volumes de dados são cifrados com a mesma chave. O NIST já não o aceita para cifrar dados novos. NÃO deve ser escolhido para novos sistemas.',
    example: 'A demonstração aplica a cifra de brinquedo três vezes (E-D-E) com chaves diferentes.',
    support: 'conceitual',
    demo: 'ede',
  },
  {
    id: 'desx',
    name: 'DESX',
    fullName: 'DES com “branqueamento” de chave (key whitening)',
    category: 'Simétrica (cifra de bloco)',
    year: '1984',
    authors: 'Ron Rivest',
    working:
      'Antes de cifrar com DES, faz XOR do bloco com uma chave extra; depois do DES, faz XOR com outra chave extra. Essa técnica (whitening) dificulta a força bruta sem mudar o DES.',
    keyType: 'Chave secreta de 184 bits (56 do DES + 2 × 64 de branqueamento)',
    block: '64 bits',
    purpose: 'Reforçar o DES contra força bruta com custo baixo.',
    applications: ['Produtos de software antigos', 'Exemplo clássico da técnica de whitening'],
    status: 'obsoleto',
    statusText: 'Continua limitado pelo bloco de 64 bits e pelo DES por dentro. Tem interesse apenas histórico e didático.',
    example: 'A demonstração mostra XOR (chave K1) → cifra de brinquedo → XOR (chave K2).',
    support: 'conceitual',
    demo: 'whitening',
  },
  {
    id: 'aes',
    name: 'AES',
    fullName: 'Advanced Encryption Standard (Rijndael)',
    category: 'Simétrica (cifra de bloco)',
    year: '2001',
    authors: 'Joan Daemen e Vincent Rijmen; padronizado pelo NIST',
    working:
      'Trabalha com blocos de 128 bits organizados como uma matriz 4×4 de bytes. Cada rodada aplica substituição de bytes (S-box), deslocamento de linhas, mistura de colunas e soma da subchave. São 10, 12 ou 14 rodadas para chaves de 128, 192 ou 256 bits (NIST, 2001).',
    keyType: 'Chave secreta de 128, 192 ou 256 bits',
    block: '128 bits',
    purpose: 'Confidencialidade; no modo GCM, também integridade e autenticidade (AEAD).',
    applications: ['HTTPS/TLS', 'Wi-Fi WPA2/WPA3', 'Criptografia de disco e de arquivos', 'Aplicativos de mensagens'],
    status: 'recomendado',
    statusText: 'Padrão atual e amplamente recomendado. Neste laboratório é executado de verdade (AES-256-GCM) pela Web Crypto API.',
    example: 'Execute o AES-256-GCM real no Módulo de Simulações.',
    support: 'webcrypto',
    demo: 'aes',
    cite: 'NIST, 2001',
  },
  {
    id: 'camellia',
    name: 'Camellia',
    fullName: 'Camellia',
    category: 'Simétrica (cifra de bloco)',
    year: '2000',
    authors: 'Mitsubishi Electric e NTT (Japão)',
    working:
      'Cifra de bloco de 128 bits baseada em rede de Feistel com 18 rodadas (chave de 128 bits) ou 24 rodadas (192/256 bits), com funções extras de mistura a cada 6 rodadas.',
    keyType: 'Chave secreta de 128, 192 ou 256 bits',
    block: '128 bits',
    purpose: 'Confidencialidade, com segurança comparável à do AES.',
    applications: ['Padrões japoneses e europeus', 'Opção em bibliotecas como OpenSSL e em alguns protocolos'],
    status: 'seguro-pouco-usado',
    statusText: 'Considerado seguro, mas bem menos utilizado que o AES. A Web Crypto API não oferece o Camellia.',
    example: 'Como o navegador não suporta Camellia, a demonstração usa a rede de Feistel de brinquedo para ilustrar a estrutura.',
    support: 'conceitual',
    demo: 'feistel',
  },
  {
    id: 'rsa',
    name: 'RSA',
    fullName: 'Rivest–Shamir–Adleman',
    category: 'Assimétrica (chave pública)',
    year: '1977',
    authors: 'Ron Rivest, Adi Shamir e Leonard Adleman',
    working:
      'Usa um par de chaves matematicamente relacionado: o que a chave pública cifra, só a chave privada correspondente decifra. A segurança depende da dificuldade de fatorar o produto de dois números primos muito grandes. Para cifrar, usa-se o esquema de preenchimento OAEP (MORIARTY et al., 2016).',
    keyType: 'Par de chaves: pública (divulgável) e privada (secreta); 2048 bits ou mais',
    block: 'Mensagem limitada ao tamanho da chave (190 bytes com RSA-2048 + OAEP/SHA-256)',
    purpose: 'Troca/proteção de chaves e assinatura digital.',
    applications: ['Certificados digitais (ICP-Brasil, HTTPS)', 'Assinatura de documentos e de software', 'Proteção de chaves em criptografia híbrida'],
    status: 'recomendado',
    statusText:
      'Seguro com chaves de 2048 bits ou mais — uma chave RSA de 2048 bits oferece cerca de 112 bits de segurança (NIST, 2020). Não deve ser usado para cifrar grandes volumes de dados diretamente. Executado de verdade (RSA-OAEP) neste laboratório.',
    example: 'Gere um par de chaves RSA-OAEP real no Módulo de Simulações.',
    support: 'webcrypto',
    demo: 'rsa',
    cite: 'MORIARTY et al., 2016',
  },
  {
    id: 'blowfish',
    name: 'Blowfish',
    fullName: 'Blowfish',
    category: 'Simétrica (cifra de bloco)',
    year: '1993',
    authors: 'Bruce Schneier',
    working:
      'Rede de Feistel de 16 rodadas sobre blocos de 64 bits. Suas S-boxes são geradas a partir da chave, o que torna a preparação da chave propositalmente lenta.',
    keyType: 'Chave secreta variável de 32 a 448 bits',
    block: '64 bits',
    purpose: 'Alternativa livre e rápida ao DES na década de 1990.',
    applications: ['Base da função de senha bcrypt', 'Softwares antigos de criptografia de arquivos e VPN'],
    status: 'legado',
    statusText: 'O bloco de 64 bits é um limite para grandes volumes de dados. Para novos sistemas, prefira AES.',
    example: 'A demonstração usa a rede de Feistel de brinquedo (o Blowfish real usa 16 rodadas e blocos de 64 bits).',
    support: 'conceitual',
    demo: 'feistel',
  },
  {
    id: 'twofish',
    name: 'Twofish',
    fullName: 'Twofish',
    category: 'Simétrica (cifra de bloco)',
    year: '1998',
    authors: 'Bruce Schneier e equipe',
    working:
      'Rede de Feistel de 16 rodadas sobre blocos de 128 bits, com S-boxes dependentes da chave. Foi um dos finalistas do concurso que escolheu o AES.',
    keyType: 'Chave secreta de 128, 192 ou 256 bits',
    block: '128 bits',
    purpose: 'Confidencialidade.',
    applications: ['Algumas ferramentas de criptografia de disco e gerenciadores de senhas'],
    status: 'seguro-pouco-usado',
    statusText: 'Sem ataques práticos conhecidos, mas pouco adotado em relação ao AES. Não suportado pela Web Crypto API.',
    example: 'A demonstração usa a rede de Feistel de brinquedo para ilustrar a estrutura.',
    support: 'conceitual',
    demo: 'feistel',
  },
  {
    id: 'safer',
    name: 'SAFER',
    fullName: 'Secure And Fast Encryption Routine',
    category: 'Simétrica (cifra de bloco)',
    year: '1993',
    authors: 'James Massey (para a Cylink)',
    working:
      'Família de cifras (SAFER K-64, SK-128, SAFER+ e SAFER++) orientada a bytes: em cada rodada, mistura cada byte com a subchave alternando XOR e adição módulo 256, aplica funções não lineares e uma camada de difusão.',
    keyType: 'Chave secreta de 64 ou 128 bits (SAFER+ aceita até 256)',
    block: '64 bits (SAFER K/SK) ou 128 bits (SAFER+)',
    purpose: 'Cifra rápida para hardware e software de 8 bits.',
    applications: ['SAFER+ serviu de base para algoritmos de autenticação do Bluetooth clássico'],
    status: 'legado',
    statusText: 'Interesse principalmente histórico. Não suportado pela Web Crypto API.',
    example: 'A demonstração mostra a mistura byte a byte com XOR e soma módulo 256 (ideia do SAFER, em versão de brinquedo).',
    support: 'conceitual',
    demo: 'safer',
  },
  {
    id: 'idea',
    name: 'IDEA',
    fullName: 'International Data Encryption Algorithm',
    category: 'Simétrica (cifra de bloco)',
    year: '1991',
    authors: 'Xuejia Lai e James Massey',
    working:
      'Opera em blocos de 64 bits divididos em 4 partes de 16 bits e mistura três operações algébricas “incompatíveis”: XOR, adição módulo 2¹⁶ e multiplicação módulo 2¹⁶+1, em 8 rodadas e meia.',
    keyType: 'Chave secreta de 128 bits',
    block: '64 bits',
    purpose: 'Confidencialidade.',
    applications: ['Versões antigas do PGP (e-mail seguro)'],
    status: 'legado',
    statusText: 'Foi bastante usado, mas tem bloco de 64 bits e hoje é considerado legado. Prefira AES.',
    example: 'A calculadora abaixo mostra as três operações do IDEA aplicadas a números de 16 bits.',
    support: 'conceitual',
    demo: 'idea',
  },
];
