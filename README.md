# CriptoLab — Laboratório Interativo de Criptografia

Aplicação web didática para a atividade prática de **Segurança da Informação** (curso técnico). Os estudantes executam, testam, comparam e compreendem técnicas de criptografia diretamente no navegador.

- **React + TypeScript + Vite + Tailwind CSS**, ícones **Lucide**, relatório em **jsPDF**.
- Criptografia **real** com a **Web Crypto API**: AES-256-GCM, RSA-OAEP (2048 bits, SHA-256), SHA-256, PBKDF2, ECDH/HKDF/ECDSA (usados na simulação de TLS).
- **Sem banco de dados e sem back-end.** Respostas, registros e evidências ficam no `sessionStorage` da aba. Nenhum dado é enviado para servidores (verificado nos testes de ponta a ponta).
- Chaves criptográficas ficam **só na memória** da página e **nunca** entram no registro ou no relatório PDF.

---

## Módulos

| # | Menu | O que o estudante faz |
|---|------|----------------------|
| 1 | **Início** | Nome do laboratório, objetivo, módulos, progresso e orientações. |
| 2 | **Introdução** | Conceitos (texto claro, cifrado, chave, simétrica, assimétrica, hash, CIA), fluxo visual cifrar → decifrar com chave correta/errada, exemplos do cotidiano e teste rápido. |
| 3 | **Algoritmos** | Fichas de DES, 3DES, DESX, AES, Camellia, RSA, Blowfish, Twofish, SAFER e IDEA (categoria, funcionamento, chave, finalidade, aplicações, situação atual). AES e RSA levam à execução real; os demais têm **demonstrações conceituais identificadas** (rede de Feistel de brinquedo, E-D-E, whitening, operações do IDEA, mistura do SAFER). |
| 4 | **Simulações** | A. Cifra de César (com ataque de força bruta) · B. AES-256-GCM (chave, IV, adulteração, chave errada) · C. RSA-OAEP (par de chaves, limite de 190 bytes) · D. SHA-256 (efeito avalanche). |
| 5 | **Desafios por RA** | Lê os 2 últimos dígitos do RA e apresenta o desafio: 00–19 arquivos (AES), 20–39 integridade (SHA-256), 40–59 RSA-OAEP, 60–79 **simulação didática** de TLS, 80–99 dados armazenados (AES + PBKDF2). Objetivo, etapas, ferramenta, perguntas e evidências. |
| 6 | **Proteção de dados pessoais** (Módulo 7 do enunciado) | Cadastro **fictício** gerado a cada sessão; tabela por campo; Etapas 1–7 (nome, telefone, hash do RG, endereço, criptografia híbrida AES + RSA, comparação, reflexão e LGPD). |
| 7 | **Evidências** | Formulário (RA, desafio, técnica, mensagem, resultado, explicação, dificuldades, conclusão), capturas de tela e registro automático das operações. |
| 8 | **Relatório** | PDF **e Word (.docx)** no formato de relatório de entrega da instituição (logos, tabela de identificação, instruções com entrega pelo Microsoft Teams, quadros de evidências e perguntas), sem chaves privadas. |
| — | **Referências** | ABNT NBR 6023:2018, com chamadas autor-data no texto. |

### O que é real e o que é didático

| Real (Web Crypto API) | Didático (identificado na tela) |
|---|---|
| AES-256-GCM, RSA-OAEP, SHA-256, PBKDF2, criptografia híbrida (wrapKey/unwrapKey), ECDH, HKDF, ECDSA | Cifra de César; demonstrações de DES/3DES/DESX/Camellia/Blowfish/Twofish/SAFER/IDEA; protocolo da simulação de TLS (as primitivas são reais, mas **nenhuma conexão TLS é estabelecida**) |

---

## Executar localmente

Requisitos: **Node.js 20 ou superior**.

```bash
npm install
npm run dev        # http://localhost:5173
```

> A Web Crypto API exige contexto seguro: funciona em `localhost` e em HTTPS. Abrir o `index.html` direto do disco não funciona.

Outros comandos:

```bash
npm run build      # verificação de tipos + build de produção em dist/
npm run preview    # serve o build em http://localhost:4173
npm test           # testes unitários (Vitest)
```

## Publicar na Vercel

**Opção 1 — pelo painel (recomendado)**
1. Envie a pasta para um repositório no GitHub.
2. Em <https://vercel.com/new>, importe o repositório.
3. A Vercel detecta Vite automaticamente (o `vercel.json` já define `npm run build` e a pasta `dist`). Clique em **Deploy**.

**Opção 2 — pela linha de comando**
```bash
npm i -g vercel
vercel          # pré-visualização
vercel --prod   # produção
```

O `vercel.json` também aplica cabeçalhos de segurança, incluindo uma **Content-Security-Policy** que impede o carregamento de recursos e conexões externas (`connect-src 'self'`).

---

## Testes

**Unitários (`npm test`, 40 testes)** — `src/test/`:
- AES-256-GCM: ida e volta, IV aleatório, adulteração e chave errada rejeitadas, vetor de teste conhecido do GCM, pacote `.clab`.
- RSA-OAEP: geração 2048 bits, cifrar/decifrar, limite de 190 bytes, chave privada errada.
- SHA-256: vetores da FIPS 180-4 (`abc` e vazio), efeito avalanche no RG.
- Criptografia híbrida: recuperação da chave AES e do cadastro; chave errada falha.
- ECDH + HKDF (mesma chave de sessão) e ECDSA.
- Cifra de César, rede de Feistel de brinquedo (reversibilidade), identificação por RA em todas as faixas e limites, dados fictícios, remoção de segredos.
- Relatório PDF e Word: seções obrigatórias, instruções do Teams, imagens e ausência de chave privada.

**Ponta a ponta (`e2e/run.mjs`, 45 verificações)** — percorre todos os módulos em um Chrome real: todos os botões das simulações, os 5 desafios por RA, as 7 etapas de proteção de dados, anexo de evidência, download do PDF e do Word, responsividade em 390 px (sem rolagem horizontal), menu móvel, **nenhuma requisição externa** e nenhum erro no console.

```bash
npm run build && npm run preview &        # em outro terminal
npm i -D playwright-core
CHROME_PATH="/caminho/do/chrome" node e2e/run.mjs
```

---

## Estrutura

```
src/
  lib/          crypto.ts (Web Crypto), classic.ts (César, Feistel de brinquedo), ra.ts,
                fakeData.ts, report.ts (PDF), encoding.ts, download.ts
  data/         algorithms.ts, questions.ts, references.ts
  components/   ui.tsx, ConceptDemos.tsx, EvidenceUploader.tsx, tools/ (César, AES, RSA, SHA)
  modules/      Home, Intro, Algorithms, Simulations, Challenges (+ challenges/), DataProtection,
                Evidence, Report, References
  store.tsx     estado da atividade (sessionStorage, sem chaves)
```

## Privacidade e segurança

- Apenas o **RA** é solicitado; não há campo de nome ou outros dados pessoais.
- Os dados de cliente do módulo de proteção são **fictícios**, gerados automaticamente e não editáveis.
- “Limpar dados da sessão” (em Evidências) apaga tudo; fechar a aba também.
- Nenhum script, fonte ou serviço externo é carregado.

## Referências

Ver a página **Referências** do laboratório (ABNT NBR 6023:2018, acesso em 12 nov. 2026). A data do artigo da Valid Certificadora não pôde ser confirmada e foi indicada como `[20--?]`, sem inventar informações bibliográficas.
