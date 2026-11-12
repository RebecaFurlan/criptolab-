// Desafio 20–39: Integridade de documentos com SHA-256.
import { useState } from 'react';
import { FileCheck2, FileWarning, Fingerprint, RotateCcw, Stamp } from 'lucide-react';
import { sha256Hex } from '../../lib/crypto';
import { useLab } from '../../store';
import { Button, Callout, Field, Output, RealSeal, Status, TextArea, useAction } from '../../components/ui';
import { HashCompare } from '../../components/tools/ShaTool';
import type { ChallengeResult } from './types';

const ORIGINAL = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS (DOCUMENTO FICTÍCIO)

Contratante: Empresa Exemplo Ltda.
Contratada: Laboratório Técnico Escolar
Objeto: manutenção de 10 computadores.
Valor total: R$ 1.000,00
Prazo: 30 dias.`;

export function IntegrityChallenge({ onResult }: { onResult: (r: ChallengeResult) => void }) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const [doc, setDoc] = useState(ORIGINAL);
  const [published, setPublished] = useState('');
  const [current, setCurrent] = useState('');
  const [checks, setChecks] = useState({ ok: false, tamper: false });

  const publish = () =>
    run('pub', async () => {
      const h = await sha256Hex(doc);
      setPublished(h);
      setCurrent('');
      addLog({ module: 'desafio', technique: 'SHA-256', action: 'Hash de referência do documento registrado', input: doc, output: h, ok: true });
      return 'Hash de referência registrado. Ele representa o documento original.';
    });

  const verify = () =>
    run('ver', async () => {
      if (!published) throw new Error('Registre o hash de referência primeiro.');
      const h = await sha256Hex(doc);
      setCurrent(h);
      const same = h === published;
      const next = { ok: checks.ok || same, tamper: checks.tamper || !same };
      setChecks(next);
      addLog({ module: 'desafio', technique: 'SHA-256', action: same ? 'Verificação: documento íntegro' : 'Verificação: ALTERAÇÃO detectada', input: doc, output: h, ok: same });
      if (next.ok && next.tamper) {
        mark('desafio:execucao');
        onResult({
          mensagem: 'Contrato fictício (texto) com valor total de R$ 1.000,00',
          resultado: `Hash de referência ${published}. Após alterar o documento, o hash mudou para ${same ? '(verificação íntegra)' : h}, revelando a adulteração.`,
        });
      }
      if (!same) throw new Error('ALTERAÇÃO DETECTADA: o hash atual é diferente do hash de referência. O documento não é o original.');
      return 'Documento íntegro: o hash atual é idêntico ao de referência.';
    });

  return (
    <div className="space-y-4">
      <RealSeal />
      <Field label="Documento (fictício)" htmlFor="doc-int" hint="Depois de registrar o hash, altere qualquer detalhe — por exemplo, o valor — e verifique novamente.">
        <TextArea id="doc-int" rows={8} value={doc} onChange={(e) => setDoc(e.target.value)} className="font-mono text-[13px]" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button icon={Stamp} onClick={publish} loading={busy === 'pub'}>
          1. Registrar hash de referência
        </Button>
        <Button variant="danger" icon={FileWarning} onClick={() => setDoc((d) => d.replace('R$ 1.000,00', 'R$ 9.000,00'))} disabled={!published}>
          2. Simular adulteração (valor)
        </Button>
        <Button variant="success" icon={FileCheck2} onClick={verify} loading={busy === 'ver'} disabled={!published}>
          3. Verificar integridade
        </Button>
        <Button variant="ghost" icon={RotateCcw} onClick={() => setDoc(ORIGINAL)}>
          Restaurar original
        </Button>
      </div>
      <Status msg={msg} />
      {published && <Output label="Hash de referência (SHA-256)" value={published} tone="cyan" />}
      {current && current !== published && <HashCompare a={published} b={current} labelA="Hash de referência" labelB="Hash do documento atual" />}
      {current && current === published && <Output label="Hash do documento atual" value={current} tone="emerald" />}
      <div className="flex gap-4 text-sm">
        <span className={checks.ok ? 'text-emerald-300' : 'text-slate-500'}>
          <Fingerprint className="mr-1 inline h-4 w-4" /> Verificação íntegra {checks.ok ? '✓' : '—'}
        </span>
        <span className={checks.tamper ? 'text-emerald-300' : 'text-slate-500'}>
          <FileWarning className="mr-1 inline h-4 w-4" /> Adulteração detectada {checks.tamper ? '✓' : '—'}
        </span>
      </div>
      <Callout title="Para que serve isso no mundo real?">
        Sites publicam o hash de programas para download, e sistemas de assinatura digital calculam o hash do documento antes de assiná-lo. Se um único caractere mudar,
        o hash muda completamente. Atenção: o hash sozinho não impede que alguém altere o documento e também o hash — por isso a referência deve ser guardada em local
        confiável ou protegida por assinatura digital.
      </Callout>
    </div>
  );
}
