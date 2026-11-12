// Demonstrações CONCEITUAIS dos algoritmos não suportados pela Web Crypto API.
// Todas usam versões "de brinquedo" e são identificadas como tal.

import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { toyFeistel, toyFeistelText, xorBytes } from '../lib/classic';
import { useLab } from '../store';
import { Button, DemoSeal, Field, Output, TextInput } from './ui';

const hex2 = (n: number) => n.toString(16).padStart(2, '0');
const bytesHex = (b: number[]) => b.map(hex2).join(' ');
const clampByte = (v: string) => Math.max(0, Math.min(255, Number.parseInt(v || '0', 10) || 0));

function useDemoMark(algo: string) {
  const { mark, addLog } = useLab();
  return (action: string) => {
    mark('alg:demo');
    addLog({ module: 'algoritmos', technique: `${algo} (demonstração conceitual)`, action, ok: true });
  };
}

export function FeistelDemo({ algo, rounds = 4 }: { algo: string; rounds?: number }) {
  const done = useDemoMark(algo);
  const [text, setText] = useState('LAB');
  const [key, setKey] = useState('77');
  const [ran, setRan] = useState(false);
  const k = clampByte(key);
  const enc = useMemo(() => toyFeistelText(text, k, rounds), [text, k, rounds]);
  const dec = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < enc.length; i += 2) {
      const { output } = toyFeistel((enc[i] << 8) | enc[i + 1], k, rounds, true);
      out.push(output >> 8, output & 0xff);
    }
    return new TextDecoder().decode(new Uint8Array(out.filter((b, i) => !(b === 0 && i === out.length - 1))));
  }, [enc, k, rounds]);
  const first = useMemo(() => {
    const b = new TextEncoder().encode(text.padEnd(2, '\0'));
    return toyFeistel((b[0] << 8) | b[1], k, rounds).trace;
  }, [text, k, rounds]);

  return (
    <div className="space-y-3">
      <DemoSeal>
        Rede de Feistel <strong>de brinquedo</strong> (blocos de 16 bits, {rounds} rodadas). Mostra a ESTRUTURA usada por {algo}, mas não é o {algo} real e não protege
        dados.
      </DemoSeal>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Texto curto" htmlFor={`f-${algo}`}>
          <TextInput id={`f-${algo}`} value={text} maxLength={12} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Chave (0–255)" htmlFor={`fk-${algo}`}>
          <TextInput id={`fk-${algo}`} inputMode="numeric" value={key} onChange={(e) => setKey(e.target.value)} />
        </Field>
      </div>
      <Button
        size="sm"
        icon={Play}
        onClick={() => {
          setRan(true);
          done('Rede de Feistel de brinquedo executada');
        }}
      >
        Executar demonstração
      </Button>
      {ran && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[360px] text-left font-mono text-xs">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Rodada</th>
                  <th className="px-3 py-2">Subchave</th>
                  <th className="px-3 py-2">F(D, k)</th>
                  <th className="px-3 py-2">Esquerda</th>
                  <th className="px-3 py-2">Direita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {first.map((r) => (
                  <tr key={r.round}>
                    <td className="px-3 py-1.5 text-cyan-300">{r.round === 0 ? 'entrada' : r.round}</td>
                    <td className="px-3 py-1.5">{r.round ? hex2(r.subkey) : '—'}</td>
                    <td className="px-3 py-1.5">{r.round ? hex2(r.f) : '—'}</td>
                    <td className="px-3 py-1.5">{hex2(r.left)}</td>
                    <td className="px-3 py-1.5">{hex2(r.right)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Em cada rodada: nova Esquerda = Direita anterior; nova Direita = Esquerda anterior XOR F(Direita, subchave). Para decifrar, basta usar as subchaves na ordem
            inversa.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Output label="Saída “cifrada” (hex)" value={bytesHex(enc)} tone="violet" />
            <Output label="Decifrada com subchaves invertidas" value={dec.replace(/\0+$/, '')} tone="emerald" mono={false} />
          </div>
        </>
      )}
    </div>
  );
}

export function EdeDemo() {
  const done = useDemoMark('3DES');
  const [text, setText] = useState('3DES');
  const [k1, setK1] = useState('17');
  const [k2, setK2] = useState('99');
  const [k3, setK3] = useState('203');
  const [out, setOut] = useState<{ e1: number[]; d2: number[]; e3: number[]; single: number[] } | null>(null);
  const run = () => {
    const b = Array.from(new TextEncoder().encode(text));
    if (b.length % 2) b.push(0);
    const blockOp = (arr: number[], k: number, decrypt: boolean) => {
      const r: number[] = [];
      for (let i = 0; i < arr.length; i += 2) {
        const { output } = toyFeistel((arr[i] << 8) | arr[i + 1], k, 4, decrypt);
        r.push(output >> 8, output & 0xff);
      }
      return r;
    };
    const e1 = blockOp(b, clampByte(k1), false);
    const d2 = blockOp(e1, clampByte(k2), true);
    const e3 = blockOp(d2, clampByte(k3), false);
    setOut({ e1, d2, e3, single: blockOp(b, clampByte(k1), false) });
    done('Esquema E-D-E de brinquedo executado');
  };
  return (
    <div className="space-y-3">
      <DemoSeal>Esquema Cifrar–Decifrar–Cifrar (E-D-E) com a cifra de brinquedo. Ilustra a ideia do 3DES; não é o 3DES real.</DemoSeal>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Texto" htmlFor="ede-t">
          <TextInput id="ede-t" value={text} maxLength={12} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="K1" htmlFor="ede-1">
          <TextInput id="ede-1" value={k1} inputMode="numeric" onChange={(e) => setK1(e.target.value)} />
        </Field>
        <Field label="K2" htmlFor="ede-2">
          <TextInput id="ede-2" value={k2} inputMode="numeric" onChange={(e) => setK2(e.target.value)} />
        </Field>
        <Field label="K3" htmlFor="ede-3">
          <TextInput id="ede-3" value={k3} inputMode="numeric" onChange={(e) => setK3(e.target.value)} />
        </Field>
      </div>
      <Button size="sm" icon={Play} onClick={run}>
        Executar E-D-E
      </Button>
      {out && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Output label="1) Cifrar com K1" value={bytesHex(out.e1)} />
          <Output label="2) Decifrar com K2" value={bytesHex(out.d2)} />
          <Output label="3) Cifrar com K3 (resultado)" value={bytesHex(out.e3)} tone="violet" />
        </div>
      )}
      {out && (
        <p className="text-xs text-slate-400">
          Experimente K1 = K2 = K3: o passo 2 desfaz o passo 1 e o resultado fica igual a uma única cifragem ({bytesHex(out.single)}). Isso permitia compatibilidade com o
          DES simples — e mostra por que o 3DES é três vezes mais lento.
        </p>
      )}
    </div>
  );
}

export function WhiteningDemo() {
  const done = useDemoMark('DESX');
  const [text, setText] = useState('DESX');
  const [k1, setK1] = useState('a5 3c');
  const [kd, setKd] = useState('42');
  const [k2, setK2] = useState('0f e1');
  const [res, setRes] = useState<{ x1: number[]; mid: number[]; x2: number[] } | null>(null);
  const parse = (s: string) => {
    const b = s
      .split(/\s+/)
      .filter(Boolean)
      .map((h) => parseInt(h, 16) & 0xff);
    return b.length ? b : [0];
  };
  const run = () => {
    const b = Array.from(new TextEncoder().encode(text));
    if (b.length % 2) b.push(0);
    const x1 = xorBytes(b, parse(k1));
    const mid: number[] = [];
    for (let i = 0; i < x1.length; i += 2) {
      const { output } = toyFeistel((x1[i] << 8) | x1[i + 1], clampByte(kd), 4);
      mid.push(output >> 8, output & 0xff);
    }
    setRes({ x1, mid, x2: xorBytes(mid, parse(k2)) });
    done('Branqueamento de chave (XOR antes e depois) executado');
  };
  return (
    <div className="space-y-3">
      <DemoSeal>Branqueamento de chave: XOR → cifra de brinquedo → XOR. Ilustra a ideia do DESX; não é o DESX real.</DemoSeal>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Texto" htmlFor="wx-t">
          <TextInput id="wx-t" value={text} maxLength={12} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="K1 (hex)" htmlFor="wx-1">
          <TextInput id="wx-1" value={k1} onChange={(e) => setK1(e.target.value)} />
        </Field>
        <Field label="Chave interna (0–255)" htmlFor="wx-k">
          <TextInput id="wx-k" value={kd} inputMode="numeric" onChange={(e) => setKd(e.target.value)} />
        </Field>
        <Field label="K2 (hex)" htmlFor="wx-2">
          <TextInput id="wx-2" value={k2} onChange={(e) => setK2(e.target.value)} />
        </Field>
      </div>
      <Button size="sm" icon={Play} onClick={run}>
        Executar
      </Button>
      {res && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Output label="1) Texto XOR K1" value={bytesHex(res.x1)} />
          <Output label="2) Cifra interna" value={bytesHex(res.mid)} />
          <Output label="3) Resultado XOR K2" value={bytesHex(res.x2)} tone="violet" />
        </div>
      )}
    </div>
  );
}

export function IdeaDemo() {
  const done = useDemoMark('IDEA');
  const [a, setA] = useState('4660');
  const [b, setB] = useState('22136');
  const [show, setShow] = useState(false);
  const A = Math.max(0, Math.min(65535, Number(a) || 0));
  const B = Math.max(0, Math.min(65535, Number(b) || 0));
  const mul = (x: number, y: number) => {
    const X = x === 0 ? 65536 : x;
    const Y = y === 0 ? 65536 : y;
    const r = Number((BigInt(X) * BigInt(Y)) % 65537n);
    return r === 65536 ? 0 : r;
  };
  const h = (n: number) => `0x${n.toString(16).padStart(4, '0')}`;
  return (
    <div className="space-y-3">
      <DemoSeal>Calculadora das três operações básicas do IDEA sobre números de 16 bits. Não executa o IDEA completo.</DemoSeal>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Número A (0–65535)" htmlFor="idea-a">
          <TextInput id="idea-a" value={a} inputMode="numeric" onChange={(e) => setA(e.target.value)} />
        </Field>
        <Field label="Número B (subchave, 0–65535)" htmlFor="idea-b">
          <TextInput id="idea-b" value={b} inputMode="numeric" onChange={(e) => setB(e.target.value)} />
        </Field>
      </div>
      <Button
        size="sm"
        icon={Play}
        onClick={() => {
          setShow(true);
          done('Operações do IDEA calculadas');
        }}
      >
        Calcular
      </Button>
      {show && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Output label="A XOR B" value={`${A ^ B} (${h(A ^ B)})`} tone="violet" />
          <Output label="(A + B) mod 2¹⁶" value={`${(A + B) % 65536} (${h((A + B) % 65536)})`} tone="violet" />
          <Output label="(A × B) mod (2¹⁶ + 1)" value={`${mul(A, B)} (${h(mul(A, B))})`} tone="violet" />
        </div>
      )}
      <p className="text-xs text-slate-400">
        O IDEA combina essas três operações, que não “combinam” algebricamente entre si, para dificultar a análise matemática. Na multiplicação, o valor 0 representa 2¹⁶.
      </p>
    </div>
  );
}

export function SaferDemo() {
  const done = useDemoMark('SAFER');
  const [text, setText] = useState('SAFER');
  const [key, setKey] = useState('5a 13 c7 08');
  const [res, setRes] = useState<{ plain: number[]; mixed: number[]; back: string } | null>(null);
  const run = () => {
    const p = Array.from(new TextEncoder().encode(text));
    const k = key
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => parseInt(x, 16) & 0xff);
    const kk = k.length ? k : [0];
    const mixed = p.map((b, i) => (i % 2 === 0 ? b ^ kk[i % kk.length] : (b + kk[i % kk.length]) & 0xff));
    const back = mixed.map((b, i) => (i % 2 === 0 ? b ^ kk[i % kk.length] : (b - kk[i % kk.length] + 256) & 0xff));
    setRes({ plain: p, mixed, back: new TextDecoder().decode(new Uint8Array(back)) });
    done('Mistura byte a byte (XOR / soma mod 256) executada');
  };
  return (
    <div className="space-y-3">
      <DemoSeal>Mistura de bytes alternando XOR e soma módulo 256 — a primeira camada de cada rodada do SAFER, em versão de brinquedo. Não é o SAFER real.</DemoSeal>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Texto" htmlFor="sf-t">
          <TextInput id="sf-t" value={text} maxLength={16} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Subchave (bytes em hex)" htmlFor="sf-k">
          <TextInput id="sf-k" value={key} onChange={(e) => setKey(e.target.value)} />
        </Field>
      </div>
      <Button size="sm" icon={Play} onClick={run}>
        Misturar
      </Button>
      {res && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Output label="Bytes originais" value={bytesHex(res.plain)} />
          <Output label="Após a mistura" value={bytesHex(res.mixed)} tone="violet" />
          <Output label="Operação inversa" value={res.back} tone="emerald" mono={false} />
        </div>
      )}
    </div>
  );
}
