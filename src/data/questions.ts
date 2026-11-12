import type { ChallengeId } from '../lib/ra';
import type { EvidenceForm } from '../store';

export interface ChallengeInfo {
  objective: string;
  steps: string[];
  questions: string[];
}

export const CHALLENGES: Record<ChallengeId, ChallengeInfo> = {
  arquivos: {
    objective: 'Proteger um arquivo com AES-256-GCM de modo que só quem tem a chave consiga abri-lo, e comprovar que a recuperação é perfeita.',
    steps: [
      'Gere o arquivo de teste (ou escolha um arquivo sem dados pessoais).',
      'Gere uma chave AES-256.',
      'Criptografe o arquivo e, se quiser, baixe o .clab e tente abri-lo em um editor de texto.',
      'Descriptografe e compare o SHA-256 do original com o do arquivo recuperado.',
      'Responda às perguntas e anexe uma captura de tela como evidência.',
    ],
    questions: [
      'Por que o arquivo .clab não pode ser lido em um editor de texto?',
      'O que aconteceria se a chave fosse perdida? E se fosse enviada junto com o arquivo?',
      'Por que comparar os hashes SHA-256 comprova que o arquivo foi recuperado sem alterações?',
    ],
  },
  integridade: {
    objective: 'Usar o SHA-256 para provar se um documento foi ou não alterado depois de registrado.',
    steps: [
      'Leia o contrato fictício e registre o hash de referência.',
      'Verifique a integridade sem alterar nada (deve conferir).',
      'Simule a adulteração do valor (ou altere qualquer caractere) e verifique de novo.',
      'Observe quantos bits do hash mudaram.',
      'Responda às perguntas e anexe uma captura de tela como evidência.',
    ],
    questions: [
      'Por que uma alteração mínima no documento gera um hash completamente diferente?',
      'O hash SHA-256 mantém o conteúdo do contrato em sigilo? Justifique.',
      'Onde o hash de referência deveria ficar guardado para que a verificação seja confiável?',
    ],
  },
  assimetrica: {
    objective: 'Usar RSA-OAEP para enviar uma mensagem que só o dono da chave privada consiga ler.',
    steps: [
      'Gere um par de chaves RSA-2048.',
      'Observe que as chaves pública e privada são diferentes.',
      'Cifre uma mensagem curta com a chave pública.',
      'Decifre com a chave privada e depois tente com outra chave privada.',
      'Responda às perguntas e anexe uma captura de tela como evidência.',
    ],
    questions: [
      'Por que a chave pública pode ser divulgada sem comprometer a segurança?',
      'O que aconteceu ao tentar decifrar com outra chave privada? Por quê?',
      'Por que o RSA não é usado para cifrar arquivos grandes diretamente? Qual é a alternativa?',
    ],
  },
  tls: {
    objective: 'Compreender, por meio de uma simulação didática, como cliente e servidor estabelecem um canal seguro inspirado no TLS 1.3.',
    steps: [
      'Execute as etapas 1 a 4 do handshake simulado, em ordem.',
      'Confira que cliente e servidor obtiveram a mesma chave de sessão.',
      'Envie uma mensagem e observe a visão do intruso.',
      'Simule a alteração de um pacote pelo intruso.',
      'Responda às perguntas e anexe uma captura de tela como evidência.',
    ],
    questions: [
      'Como cliente e servidor chegam à mesma chave de sessão sem enviá-la pela rede?',
      'Qual é o papel do certificado e da assinatura do servidor?',
      'O que o intruso consegue ver e o que ele não consegue fazer? Por que esta atividade é apenas uma simulação?',
    ],
  },
  armazenados: {
    objective: 'Proteger dados “em repouso” cifrando uma coluna de um banco de dados fictício com AES-256-GCM e uma chave derivada por PBKDF2.',
    steps: [
      'Observe a tabela sem proteção.',
      'Crie uma frase-senha de teste e cifre os registros antes de “gravar”.',
      'Compare o que fica gravado no banco com o que o aplicativo autorizado lê.',
      'Simule um vazamento: tente ler o banco com outra senha.',
      'Responda às perguntas e anexe uma captura de tela como evidência.',
    ],
    questions: [
      'O que um invasor obtém ao copiar o banco de dados protegido?',
      'Por que a chave não pode ficar guardada no mesmo banco de dados?',
      'Para que servem o PBKDF2 e o salt?',
    ],
  },
};


export const LGPD_QUESTIONS = [
  'O invasor conseguirá visualizar os dados criptografados?',
  'O que acontece se ele também conseguir obter as chaves?',
  'Qual é a diferença entre criptografia e hash?',
  'A criptografia elimina todos os riscos de vazamento?',
  'Quais outras medidas de segurança a empresa deveria adotar?',
  'Por que a proteção dos dados pessoais é importante?',
  'Qual é a relação entre essa atividade e a LGPD?',
];

export const STEP_QUESTIONS: Record<string, string> = {
  'prot:q1': 'Por que o nome deixou de ser compreensível após a criptografia?',
  'prot:q2': 'Caso alguém consiga acessar o banco de dados, conseguirá visualizar o telefone sem possuir a chave?',
  'prot:q3': 'Por que o hash do RG mudou completamente e por que não é possível recuperar o RG a partir dele?',
  'prot:q4': 'Qual é a diferença entre o endereço original e o texto cifrado? O que foi necessário para recuperá-lo?',
  'prot:q5': 'Por que a criptografia híbrida usa AES para os dados e RSA apenas para a chave?',
};


export const EVIDENCE_FIELDS: { id: keyof EvidenceForm; label: string; long?: boolean; hint?: string }[] = [
  { id: 'ra', label: 'RA ou identificação acadêmica', hint: 'Não informe nome completo nem outros dados pessoais.' },
  { id: 'turma', label: 'Turma / período (opcional)' },
  { id: 'desafio', label: 'Desafio recebido' },
  { id: 'tecnica', label: 'Técnica utilizada' },
  { id: 'mensagem', label: 'Mensagem original de teste', long: true, hint: 'Use apenas mensagens de teste ou os dados fictícios do laboratório.' },
  { id: 'resultado', label: 'Resultado da operação', long: true },
  { id: 'explicacao', label: 'Explicação do resultado', long: true },
  { id: 'dificuldades', label: 'Dificuldades encontradas', long: true },
  { id: 'conclusao', label: 'Conclusão do estudante', long: true },
];

export const REQUIRED_EVIDENCE: (keyof EvidenceForm)[] = ['ra', 'desafio', 'tecnica', 'mensagem', 'resultado', 'explicacao', 'conclusao'];

