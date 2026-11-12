import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Cloud,
  FileKey2,
  Fingerprint,
  Globe,
  KeyRound,
  Lock,
  LockOpen,
  MessageCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { caesarDecrypt, caesarEncrypt } from '../lib/classic';
import { useLab } from '../store';
import { Badge, Button, Callout, Card, Cite, Field, Flow, PageHeader, TextInput, cx } from '../components/ui';

const CONCEPTS: { title: string; text: string; example: string }[] = [
  {
    title: 'O que é criptografia?',
    text: 'Conjunto de técnicas que transformam uma informação legível em algo incompreensível para quem não tem a chave, permitindo depois recuperá-la.',
    example: 'Ex.: a senha que você digita em um site com HTTPS viaja cifrada pela rede.',
  },
  { title: 'Texto claro', text: 'A informação original, legível, antes de ser protegida (em inglês, plaintext).', example: 'Ex.: “Reunião às 15h”.' },
  {
    title: 'Texto cifrado',
    text: 'O resultado da criptografia: parece aleatório e não revela o conteúdo sem a chave correta (ciphertext).',
    example: 'Ex.: “q3Xv9+Lk2PZ…”.',
  },
  {
    title: 'Chave criptográfica',
    text: 'Valor secreto (ou par de valores) que controla o algoritmo. O algoritmo pode ser público; a segurança depende de proteger a chave.',
    example: 'Ex.: uma chave AES de 256 bits tem 2²⁵⁶ possibilidades.',
  },
  {
    title: 'Criptografia simétrica',
    text: 'A MESMA chave cifra e decifra. É rápida e ideal para grandes volumes de dados; o desafio é compartilhar a chave com segurança.',
    example: 'Ex.: AES, Camellia, Twofish.',
  },
  {
    title: 'Criptografia assimétrica',
    text: 'Usa um PAR de chaves: a pública cifra (ou verifica assinaturas) e a privada decifra (ou assina). Resolve a troca de chaves, mas é mais lenta.',
    example: 'Ex.: RSA, curvas elípticas.',
  },
  {
    title: 'Hash',
    text: 'Função de mão única que gera um “resumo” de tamanho fixo. Não usa chave e não pode ser revertida.',
    example: 'Ex.: SHA-256 gera sempre 64 caracteres hexadecimais.',
  },
  {
    title: 'Criptografia × hash',
    text: 'Criptografia é reversível (com a chave) e protege o sigilo. Hash é irreversível e serve para verificar integridade ou comparar valores.',
    example: 'Ex.: cifrar um telefone (preciso ler depois) × gerar hash de um arquivo (verificar se mudou).',
  },
  {
    title: 'Confidencialidade, integridade e autenticidade',
    text: 'Os objetivos da segurança atendidos pela criptografia: só quem pode lê; ninguém altera sem ser detectado; sabe-se quem enviou.',
    example: 'Ex.: AES-GCM garante sigilo e detecta alterações; assinaturas digitais comprovam a origem.',
  },
];

const QUIZ: { q: string; options: string[]; answer: number; why: string }[] = [
  {
    q: 'Na criptografia simétrica…',
    options: ['…a mesma chave cifra e decifra.', '…a chave pública decifra.', '…não existe chave.'],
    answer: 0,
    why: 'Simétrica = uma única chave secreta compartilhada.',
  },
  {
    q: 'É possível recuperar o texto original a partir de um hash SHA-256?',
    options: ['Sim, usando a chave correta.', 'Não: o hash é de mão única.', 'Sim, se o texto for curto.'],
    answer: 1,
    why: 'Hash não tem chave nem processo inverso.',
  },
  {
    q: 'No RSA, qual chave é usada para cifrar uma mensagem destinada a Ana?',
    options: ['A chave privada de Ana.', 'A chave pública de Ana.', 'A chave privada de quem envia.'],
    answer: 1,
    why: 'Qualquer um cifra com a chave pública de Ana; só a privada dela decifra.',
  },
  {
    q: 'Detectar que um arquivo foi modificado é um exemplo de…',
    options: ['Confidencialidade', 'Integridade', 'Disponibilidade'],
    answer: 1,
    why: 'Integridade = garantia de que a informação não foi alterada indevidamente.',
  },
];

export default function Intro() {
  const { mark, state, addLog } = useLab();
  const [plain, setPlain] = useState('SEGREDO');
  const [key, setKey] = useState(3);
  const [guess, setGuess] = useState(1);
  const cipher = useMemo(() => caesarEncrypt(plain, key), [plain, key]);
  const recovered = useMemo(() => caesarDecrypt(cipher, guess), [cipher, guess]);
  const correct = guess === key;
  const [picked, setPicked] = useState<Record<number, number>>({});
  const allRight = QUIZ.every((q, i) => picked[i] === q.answer);

  return (
    <div className="space-y-6">
      <PageHeader icon={BookOpen} kicker="Módulo 1" title="Introdução à criptografia">
        Antes de executar algoritmos, entenda as peças do quebra-cabeça. Toque em cada conceito para ver um exemplo.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONCEPTS.map((c) => (
          <details key={c.title} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 open:border-cyan-400/40">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-2 font-semibold text-white">
              {c.title}
              <span className="text-xs text-cyan-300 group-open:hidden">ver</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.text}</p>
            <p className="mt-2 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs text-cyan-200">{c.example}</p>
          </details>
        ))}
      </div>

      <Card title="Exemplo visual: cifrar e decifrar" icon={KeyRound} subtitle="Usando a Cifra de César para enxergar cada etapa (cifra clássica, apenas didática).">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field label="Texto original (texto claro)" htmlFor="intro-plain">
            <TextInput id="intro-plain" value={plain} maxLength={40} onChange={(e) => setPlain(e.target.value)} />
          </Field>
          <Field label={`Chave de cifragem: ${key}`} htmlFor="intro-key">
            <input id="intro-key" type="range" min={1} max={25} value={key} onChange={(e) => setKey(Number(e.target.value))} className="w-full accent-cyan-400" />
          </Field>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Criptografia</p>
          <Flow
            steps={[
              { label: 'Texto original', sub: plain || '…', tone: 'slate', icon: Lock },
              { label: 'Algoritmo + chave', sub: `César, desloc. ${key}`, tone: 'amber', icon: KeyRound },
              { label: 'Texto cifrado', sub: cipher || '…', tone: 'cyan', icon: Lock },
            ]}
          />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Processo inverso (descriptografia)</p>
          <Field label={`Chave usada para decifrar: ${guess}`} htmlFor="intro-guess" hint="Arraste até encontrar a chave correta.">
            <input
              id="intro-guess"
              type="range"
              min={1}
              max={25}
              value={guess}
              onChange={(e) => {
                const g = Number(e.target.value);
                setGuess(g);
                if (g === key) {
                  mark('intro:fluxo');
                  if (!state.milestones['intro:fluxo']) addLog({ module: 'introducao', technique: 'Cifra de César (didática)', action: 'Fluxo de cifrar/decifrar explorado', ok: true });
                }
              }}
              className="w-full accent-emerald-400"
            />
          </Field>
          <div className="mt-3">
            <Flow
              steps={[
                { label: 'Texto cifrado', sub: cipher || '…', tone: 'cyan' },
                { label: correct ? 'Chave correta' : 'Chave errada', sub: `desloc. ${guess}`, tone: correct ? 'emerald' : 'rose', icon: KeyRound },
                { label: correct ? 'Texto original recuperado' : 'Texto sem sentido', sub: recovered || '…', tone: correct ? 'emerald' : 'rose', icon: correct ? LockOpen : XCircle },
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Criptografia × hash" icon={Fingerprint}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Característica</th>
                  <th className="py-2 pr-3">Criptografia</th>
                  <th className="py-2">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {[
                  ['Usa chave?', 'Sim', 'Não'],
                  ['Reversível?', 'Sim, com a chave', 'Não'],
                  ['Tamanho do resultado', 'Proporcional à entrada', 'Fixo (256 bits no SHA-256)'],
                  ['Objetivo principal', 'Confidencialidade', 'Integridade / comparação'],
                  ['Exemplos', 'AES, RSA', 'SHA-256'],
                ].map(([a, b, c]) => (
                  <tr key={a}>
                    <td className="py-2 pr-3 font-medium text-slate-400">{a}</td>
                    <td className="py-2 pr-3">{b}</td>
                    <td className="py-2">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Os três pilares" icon={ShieldCheck}>
          <div className="grid gap-3">
            {[
              ['Confidencialidade', 'Somente pessoas autorizadas conseguem ler.', 'AES, RSA', 'cyan'],
              ['Integridade', 'Qualquer alteração é detectada.', 'SHA-256, etiqueta do AES-GCM', 'amber'],
              ['Autenticidade', 'É possível confirmar a origem da informação.', 'Assinaturas e certificados digitais', 'emerald'],
            ].map(([t, d, tech, tone]) => (
              <div key={t} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{t}</p>
                  <p className="text-sm text-slate-400">{d}</p>
                  <div className="mt-1">
                    <Badge tone={tone as 'cyan'}>{tech}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Criptografia no seu dia a dia" icon={Globe}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Globe,
              t: 'HTTPS',
              d: 'O cadeado no navegador indica o protocolo TLS: o navegador e o site combinam chaves de sessão e cifram tudo o que trafega.',
              c: 'RESCORLA, 2018',
            },
            { icon: MessageCircle, t: 'Aplicativos de mensagens', d: 'Muitos usam criptografia de ponta a ponta: só os aparelhos dos participantes têm as chaves.' },
            { icon: Cloud, t: 'Armazenamento de arquivos', d: 'Discos, celulares e serviços de nuvem cifram arquivos “em repouso”, normalmente com AES.' },
            { icon: BadgeCheck, t: 'Certificados digitais', d: 'Vinculam uma chave pública a uma pessoa, empresa ou site (como na ICP-Brasil) e permitem assinar documentos.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <x.icon className="h-6 w-6 text-cyan-300" aria-hidden />
              <p className="mt-2 font-semibold text-white">{x.t}</p>
              <p className="mt-1 text-sm text-slate-400">
                {x.d} {x.c && <Cite c={x.c} />}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Verifique o que aprendeu" icon={FileKey2} subtitle="Responda às 4 perguntas. Você pode tentar quantas vezes quiser.">
        <div className="space-y-4">
          {QUIZ.map((q, i) => (
            <fieldset key={i} className="rounded-xl border border-slate-800 p-3">
              <legend className="px-1 text-sm font-semibold text-white">
                {i + 1}. {q.q}
              </legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {q.options.map((o, j) => {
                  const chosen = picked[i] === j;
                  const right = j === q.answer;
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                      aria-pressed={chosen}
                      className={cx(
                        'rounded-xl border px-3 py-2 text-left text-sm transition',
                        chosen && right && 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100',
                        chosen && !right && 'border-rose-400/60 bg-rose-400/10 text-rose-100',
                        !chosen && 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500',
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {picked[i] !== undefined && (
                <p className={cx('mt-2 flex items-center gap-1.5 text-xs', picked[i] === q.answer ? 'text-emerald-300' : 'text-rose-300')}>
                  {picked[i] === q.answer ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {picked[i] === q.answer ? q.why : 'Ainda não. Tente outra opção.'}
                </p>
              )}
            </fieldset>
          ))}
          <Button
            variant="success"
            icon={CheckCircle2}
            disabled={!allRight}
            onClick={() => {
              mark('intro:quiz');
              addLog({ module: 'introducao', technique: 'Conceitos', action: 'Teste rápido concluído (4/4 acertos)', ok: true });
            }}
          >
            {state.milestones['intro:quiz'] ? 'Teste concluído ✓' : 'Registrar conclusão do teste'}
          </Button>
          {!state.milestones['intro:fluxo'] && (
            <Callout tone="info">Para concluir o módulo, também encontre a chave correta no exemplo visual de descriptografia acima.</Callout>
          )}
        </div>
      </Card>
    </div>
  );
}
