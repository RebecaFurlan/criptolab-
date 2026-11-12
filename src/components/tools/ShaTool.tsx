import { useState } from 'react';
import { Fingerprint, PencilLine } from 'lucide-react';
import { sha256 } from '../../lib/crypto';
import { bitDifference, toHex } from '../../lib/encoding';
import { useLab, type ModuleId } from '../../store';
import { Button, Callout, Cite, Field, Output, RealSeal, Status, TextArea, TextInput, useAction } from '../ui';

/** Mostra dois hashes lado a lado, destacando os caracteres que mudaram. */
export function HashCompare({ a, b, labelA, labelB }: { a: string; b: string; labelA: string; labelB: string }) {
  const bytesA = Uint8Array.from(a.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const bytesB = Uint8Array.from(b.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const bits = bitDifference(bytesA, bytesB);
  const sameChars = [...a].filter((c, i) => c === b[i]).length;
  const render = (h: string, other: string) =>
    [...h].map((c, i) => (
      <span key={i} className={c === other[i] ? 'text-slate-500' : 'text-amber-300'}>
        {c}
      </span>
    ));
  return (
    <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{labelA}</p>
        <p className="break-all font-mono text-[13px]">{render(a, b)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{labelB}</p>
        <p className="break-all font-mono text-[13px]">{render(b, a)}</p>
      </div>
      <p className="text-sm text-amber-100">
        <strong>{bits}</strong> de 256 bits mudaram ({Math.round((bits / 256) * 100)}%). Apenas {sameChars} de 64 caracteres hexadecimais coincidiram (por acaso). Uma
        pequena alteração na entrada muda o hash por completo — é o <em>efeito avalanche</em>.
      </p>
    </div>
  );
}

export function changeOneLetter(text: string): string {
  const idx = [...text].map((c, i) => (/[A-Za-z0-9]/.test(c) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return text + '.';
  const i = idx[Math.floor(idx.length / 2)];
  const c = text[i];
  const next = /[0-9]/.test(c) ? String((Number(c) + 1) % 10) : c === 'z' ? 'a' : c === 'Z' ? 'A' : String.fromCharCode(c.charCodeAt(0) + 1);
  return text.slice(0, i) + next + text.slice(i + 1);
}

export function ShaTool({ module, milestone, initialText = 'Laboratório de Criptografia' }: { module: ModuleId; milestone?: string; initialText?: string }) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const [text, setText] = useState(initialText);
  const [hash, setHash] = useState('');
  const [hashedText, setHashedText] = useState('');
  const [text2, setText2] = useState('');
  const [hash2, setHash2] = useState('');

  const gen = () =>
    run('h1', async () => {
      const h = toHex(await sha256(text));
      setHash(h);
      setHashedText(text);
      setHash2('');
      setText2(changeOneLetter(text));
      addLog({ module, technique: 'SHA-256', action: 'Geração de hash', input: text, output: h, ok: true });
      return 'Hash SHA-256 gerado: sempre 256 bits (64 caracteres hexadecimais), qualquer que seja o tamanho da entrada.';
    });

  const gen2 = () =>
    run('h2', async () => {
      const h = toHex(await sha256(text2));
      setHash2(h);
      addLog({ module, technique: 'SHA-256', action: 'Hash do texto modificado', input: text2, output: h, ok: true });
      if (milestone) mark(milestone);
      return h === hash ? 'Os textos são idênticos, então os hashes também são.' : 'Novo hash gerado. Compare abaixo.';
    });

  return (
    <div className="space-y-4">
      <RealSeal />
      <Field label="Texto de entrada" htmlFor={`sha-${module}`}>
        <TextArea id={`sha-${module}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </Field>
      <Button icon={Fingerprint} onClick={gen} loading={busy === 'h1'}>
        Gerar hash SHA-256
      </Button>
      {hash && <Output label={`SHA-256 de “${hashedText.slice(0, 40)}”`} value={hash} tone="cyan" />}

      {hash && (
        <div className="space-y-3 rounded-xl border border-slate-700 p-3">
          <Field label="Mesmo texto com uma letra alterada (edite se quiser)" htmlFor={`sha2-${module}`}>
            <TextInput id={`sha2-${module}`} value={text2} onChange={(e) => setText2(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={PencilLine} onClick={() => setText2(changeOneLetter(text2 || text))}>
              Alterar outra letra
            </Button>
            <Button size="sm" icon={Fingerprint} onClick={gen2} loading={busy === 'h2'}>
              Gerar novo hash
            </Button>
          </div>
        </div>
      )}
      <Status msg={msg} />
      {hash && hash2 && <HashCompare a={hash} b={hash2} labelA="Hash original" labelB="Hash após a alteração" />}

      <Callout tone="warn" title="Hash NÃO é criptografia">
        O SHA-256 é uma função de resumo (hash) de mão única: transforma qualquer entrada em um valor de 256 bits <Cite c="NIST, 2015" />. Não existe chave e não existe
        “descriptografar”: a partir do hash não é possível recuperar o texto original. Ele serve para verificar <strong>integridade</strong> (detectar se algo foi
        alterado) e para comparar valores sem guardar o original. Quando é preciso ler o dado de novo, usa-se criptografia (como o AES).
      </Callout>
    </div>
  );
}
