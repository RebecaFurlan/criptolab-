import { useEffect, useState, type ReactNode } from 'react';
import { ClipboardPaste, ListChecks, Search, Target } from 'lucide-react';
import { CHALLENGE_RANGES, formatRange, resolveRa } from '../lib/ra';
import { CHALLENGES } from '../data/questions';
import { useLab } from '../store';
import { go } from '../nav';
import { Badge, Button, Callout, Card, Field, PageHeader, Question, Status, TextInput, cx, type StatusMsg } from '../components/ui';
import { RsaTool } from '../components/tools/RsaTool';
import { EvidenceUploader } from '../components/EvidenceUploader';
import { FileChallenge } from './challenges/FileChallenge';
import { IntegrityChallenge } from './challenges/IntegrityChallenge';
import { TlsChallenge } from './challenges/TlsChallenge';
import { StorageChallenge } from './challenges/StorageChallenge';
import type { ChallengeResult } from './challenges/types';

export default function Challenges() {
  const { state, setRa, mark, addLog, setEvidence } = useLab();
  const [input, setInput] = useState(state.ra);
  const [msg, setMsg] = useState<StatusMsg>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const res = state.ra ? resolveRa(state.ra) : null;
  const active = res && res.ok ? res : null;

  const submit = () => {
    const r = resolveRa(input);
    if (!r.ok) return setMsg({ kind: 'error', text: r.error });
    setRa(input.trim());
    mark('desafio:ra');
    addLog({ module: 'desafio', technique: r.range.technique, action: `Desafio identificado pelo final ${String(r.lastTwo).padStart(2, '0')}: ${r.range.title}`, ok: true });
    setMsg({ kind: 'success', text: `Final ${String(r.lastTwo).padStart(2, '0')} → faixa ${formatRange(r.range)}: ${r.range.title}.` });
    setEvidence({ ra: input.trim(), desafio: r.range.title, tecnica: r.range.technique });
  };

  const info = active ? CHALLENGES[active.range.id] : null;
  const qIds = active ? info!.questions.map((_, i) => `desafio:${active.range.id}:q${i + 1}`) : [];
  const allAnswered = qIds.length > 0 && qIds.every((id) => (state.answers[id] ?? '').trim().length >= 10);

  useEffect(() => {
    if (allAnswered) mark('desafio:respostas');
  }, [allAnswered, mark]);

  let tool: ReactNode = null;
  if (active) {
    switch (active.range.id) {
      case 'arquivos':
        tool = <FileChallenge onResult={setResult} />;
        break;
      case 'integridade':
        tool = <IntegrityChallenge onResult={setResult} />;
        break;
      case 'assimetrica':
        tool = (
          <RsaTool
            module="desafio"
            milestone="desafio:execucao"
            onDone={(o) => setResult({ mensagem: o.plaintext, resultado: `Cifrado com a chave pública (RSA-OAEP, 256 bytes): ${o.ciphertextB64.slice(0, 48)}… Decifrado com a chave privada: “${o.decrypted}”.` })}
          />
        );
        break;
      case 'tls':
        tool = <TlsChallenge onResult={setResult} />;
        break;
      case 'armazenados':
        tool = <StorageChallenge onResult={setResult} />;
        break;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Target} kicker="Módulo 4" title="Desafios por RA">
        Cada estudante recebe um desafio de acordo com os <strong>dois últimos dígitos do RA</strong>. Informe apenas o RA — nenhum outro dado pessoal é solicitado.
      </PageHeader>

      <Card title="Identificação acadêmica" icon={Search}>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex-1">
            <Field label="RA (registro acadêmico)" htmlFor="ra" hint="Somente os dígitos são considerados. Ex.: 2026001234 → final 34.">
              <TextInput id="ra" value={input} onChange={(e) => setInput(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="Digite seu RA" />
            </Field>
          </div>
          <Button type="submit" icon={Target}>
            Identificar desafio
          </Button>
        </form>
        <div className="mt-3">
          <Status msg={msg} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {CHALLENGE_RANGES.map((r) => (
            <div
              key={r.id}
              className={cx(
                'rounded-xl border p-2.5 text-xs transition',
                active?.range.id === r.id ? 'border-cyan-400/60 bg-cyan-400/15 text-white' : 'border-slate-800 bg-slate-950/40 text-slate-400',
              )}
            >
              <p className="font-mono text-sm font-bold">{formatRange(r)}</p>
              <p className="font-semibold">{r.title}</p>
              <p className="opacity-80">{r.technique}</p>
            </div>
          ))}
        </div>
      </Card>

      {active && info && (
        <>
          <Card
            title={`Desafio: ${active.range.title}`}
            icon={ListChecks}
            subtitle={
              <span className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">Final {String(active.lastTwo).padStart(2, '0')}</Badge>
                <Badge tone="emerald">{active.range.technique}</Badge>
              </span>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Objetivo</p>
                <p className="mt-1 text-slate-200">{info.objective}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Etapas de execução</p>
                <ol className="mt-1 space-y-1 text-sm text-slate-300">
                  {info.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-cyan-300">{i + 1}.</span> {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Card>

          <Card title="Execução">{tool}</Card>

          <Card title="Respostas" subtitle="Responda com suas palavras (mínimo de 10 caracteres cada).">
            <div className="space-y-3">
              {info.questions.map((q, i) => (
                <Question key={q} id={qIds[i]} n={i + 1} prompt={q} />
              ))}
            </div>
          </Card>

          <Card title="Evidências" subtitle="Registre o resultado no formulário de evidências e anexe capturas de tela.">
            <div className="space-y-4">
              {result ? (
                <Callout tone="success" title="Resultado pronto para registrar">
                  <p className="break-words">{result.resultado}</p>
                </Callout>
              ) : (
                <Callout>Execute o desafio para gerar um resultado que pode ser enviado ao formulário de evidências.</Callout>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={ClipboardPaste}
                  disabled={!result}
                  onClick={() => {
                    if (!result) return;
                    setEvidence({ ra: state.ra, desafio: active.range.title, tecnica: active.range.technique, mensagem: result.mensagem, resultado: result.resultado });
                    go('evidencias');
                  }}
                >
                  Enviar resultado para Evidências
                </Button>
              </div>
              <EvidenceUploader context={`Desafio: ${active.range.title}`} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
