import { useState } from 'react';
import { Lock, LockOpen, Swords } from 'lucide-react';
import { caesarBruteForce, caesarDecrypt, caesarEncrypt, hasNonAsciiLetters } from '../../lib/classic';
import { useLab, type ModuleId } from '../../store';
import { Badge, Button, Callout, Field, Output, Status, TextArea, TextInput, type StatusMsg } from '../ui';

export function CaesarTool({ module, milestone }: { module: ModuleId; milestone?: string }) {
  const { addLog, mark } = useLab();
  const [text, setText] = useState('ATAQUE AO AMANHECER');
  const [shift, setShift] = useState('3');
  const [result, setResult] = useState('');
  const [msg, setMsg] = useState<StatusMsg>(null);
  const [brute, setBrute] = useState(false);

  const parseShift = (): number | null => {
    if (!/^-?\d{1,3}$/.test(shift.trim())) {
      setMsg({ kind: 'error', text: 'Informe um deslocamento inteiro (ex.: 3). Valores maiores que 25 “dão a volta” no alfabeto.' });
      return null;
    }
    return Number(shift);
  };

  const act = (mode: 'enc' | 'dec') => {
    if (!text.trim()) return setMsg({ kind: 'error', text: 'Digite uma mensagem.' });
    const s = parseShift();
    if (s === null) return;
    const out = mode === 'enc' ? caesarEncrypt(text, s) : caesarDecrypt(text, s);
    setResult(out);
    setMsg({
      kind: 'success',
      text: `${mode === 'enc' ? 'Criptografado' : 'Descriptografado'} com deslocamento ${s} (equivale a ${(((s % 26) + 26) % 26)}).${hasNonAsciiLetters(text) ? ' Letras acentuadas e “ç” não são alteradas.' : ''}`,
    });
    addLog({ module, technique: 'Cifra de César (didática)', action: mode === 'enc' ? `Criptografia (desloc. ${s})` : `Descriptografia (desloc. ${s})`, input: text, output: out, ok: true });
    if (milestone) mark(milestone);
  };

  return (
    <div className="space-y-4">
      <Badge tone="violet">Cifra clássica · didática, sem segurança</Badge>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field label="Mensagem" htmlFor={`cesar-${module}`}>
          <TextArea id={`cesar-${module}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} />
        </Field>
        <Field label="Deslocamento (chave)" htmlFor={`shift-${module}`}>
          <TextInput id={`shift-${module}`} inputMode="numeric" value={shift} onChange={(e) => setShift(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button icon={Lock} onClick={() => act('enc')}>
          Criptografar
        </Button>
        <Button variant="success" icon={LockOpen} onClick={() => act('dec')}>
          Descriptografar
        </Button>
        {result && (
          <Button variant="secondary" onClick={() => setText(result)}>
            Usar resultado como entrada
          </Button>
        )}
      </div>
      <Status msg={msg} />
      {result && <Output label="Resultado" value={result} tone="cyan" />}

      <div className="rounded-xl border border-slate-700 p-3">
        <Button size="sm" variant="secondary" icon={Swords} onClick={() => setBrute((b) => !b)}>
          {brute ? 'Ocultar ataque de força bruta' : 'Simular ataque de força bruta'}
        </Button>
        {brute && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-slate-300">
              Um atacante que não conhece a chave testa os 25 deslocamentos possíveis sobre o texto “{(result || text).slice(0, 40)}”. Encontre a linha legível:
            </p>
            <ol className="max-h-64 overflow-auto rounded-lg bg-slate-950/70 p-2 font-mono text-xs">
              {caesarBruteForce(result || text).map((r) => (
                <li key={r.shift} className="flex gap-3 px-1 py-0.5 odd:bg-slate-900/60">
                  <span className="w-8 shrink-0 text-right text-cyan-300">{r.shift}</span>
                  <span className="break-all text-slate-200">{r.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <Callout tone="warn" title="Por que a Cifra de César não é segura?">
        Ela só tem 25 chaves possíveis, então qualquer pessoa descobre a mensagem testando todas em segundos. Além disso, preserva a frequência das letras. É ótima para
        entender as ideias de <strong>algoritmo</strong> (deslocar letras) e <strong>chave</strong> (quantas posições), mas nunca deve proteger dados reais. Algoritmos
        modernos como o AES-256 têm 2<sup>256</sup> chaves possíveis.
      </Callout>
    </div>
  );
}
