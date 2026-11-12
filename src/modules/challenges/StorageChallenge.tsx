// Desafio 80–99: Proteção de dados armazenados (AES-256-GCM com chave derivada por PBKDF2).
import { useState } from 'react';
import { Database, DatabaseZap, KeyRound, Lock, LockOpen, Skull } from 'lucide-react';
import { PBKDF2_ITERATIONS, aesDecrypt, aesEncrypt, deriveAesKeyFromPassword, keyFingerprint, randomBytes } from '../../lib/crypto';
import { fromBase64, fromHex, fromUtf8, toBase64, toHex } from '../../lib/encoding';
import { useLab } from '../../store';
import { Badge, Button, Callout, Cite, Field, RealSeal, Status, TextInput, cx, useAction } from '../../components/ui';
import type { ChallengeResult } from './types';

const ROWS = [
  { id: 1, cliente: 'Cliente 001', obs: 'Prefere contato por e-mail; plano Premium (fictício)' },
  { id: 2, cliente: 'Cliente 002', obs: 'Pagamento anual; endereço de entrega na Rua Exemplo, 10 (fictício)' },
  { id: 3, cliente: 'Cliente 003', obs: 'Solicitou suporte técnico em 05/11 (fictício)' },
];

interface Stored {
  id: number;
  cliente: string;
  iv: string;
  obs: string; // base64 do texto cifrado
}

export function StorageChallenge({ onResult }: { onResult: (r: ChallengeResult) => void }) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const [pass, setPass] = useState('frase-de-teste-do-lab');
  const [salt] = useState(() => randomBytes(16));
  const [fp, setFp] = useState('');
  const [db, setDb] = useState<Stored[] | null>(null);
  const [view, setView] = useState<'app' | 'db' | 'leak'>('db');
  const [appRows, setAppRows] = useState<string[] | null>(null);
  const [leakPass, setLeakPass] = useState('123456');

  const derive = (p: string) => deriveAesKeyFromPassword(p, salt);

  const protect = () =>
    run('enc', async () => {
      if (pass.length < 8) throw new Error('Use uma frase de teste com pelo menos 8 caracteres (não use uma senha real sua).');
      const t0 = performance.now();
      const key = await derive(pass);
      const ms = Math.round(performance.now() - t0);
      setFp(await keyFingerprint(key));
      const out: Stored[] = [];
      for (const r of ROWS) {
        const { iv, ciphertext } = await aesEncrypt(key, r.obs);
        out.push({ id: r.id, cliente: r.cliente, iv: toHex(iv), obs: toBase64(ciphertext) });
      }
      setDb(out);
      setAppRows(null);
      setView('db');
      addLog({ module: 'desafio', technique: 'AES-256-GCM + PBKDF2', action: `3 registros cifrados antes de gravar (PBKDF2 ${PBKDF2_ITERATIONS.toLocaleString('pt-BR')} iterações, ${ms} ms)`, output: out[0].obs, ok: true });
      return `Chave derivada da frase com PBKDF2 (${PBKDF2_ITERATIONS.toLocaleString('pt-BR')} iterações, ${ms} ms) e 3 registros cifrados.`;
    });

  const openApp = () =>
    run('app', async () => {
      if (!db) throw new Error('Proteja os dados primeiro.');
      const key = await derive(pass);
      const rows: string[] = [];
      for (const r of db) rows.push(fromUtf8(await aesDecrypt(key, fromHex(r.iv), fromBase64(r.obs))));
      setAppRows(rows);
      setView('app');
      mark('desafio:execucao');
      addLog({ module: 'desafio', technique: 'AES-256-GCM + PBKDF2', action: 'Aplicativo autorizado leu os registros com a chave correta', output: rows[0], ok: true });
      onResult({
        mensagem: `Observações de 3 clientes fictícios (ex.: “${ROWS[0].obs}”)`,
        resultado: `Gravado no banco: ${db[0].obs.slice(0, 40)}… (ilegível). Com a chave correta, o aplicativo recuperou: “${rows[0]}”. Com senha errada, a leitura falha.`,
      });
      return 'Com a chave correta, o aplicativo recuperou os dados originais.';
    });

  const leak = () =>
    run('leak', async () => {
      if (!db) throw new Error('Proteja os dados primeiro.');
      setView('leak');
      const key = await derive(leakPass);
      try {
        await aesDecrypt(key, fromHex(db[0].iv), fromBase64(db[0].obs));
        return 'O invasor acertou a frase! Por isso a chave/senha precisa ser forte e guardada separadamente do banco.';
      } catch {
        addLog({ module: 'desafio', technique: 'AES-256-GCM + PBKDF2', action: `Invasor tentou a senha “${leakPass}” e falhou`, ok: false });
        throw new Error(`Resultado esperado — o invasor copiou o banco, mas a senha “${leakPass}” gera outra chave e a descriptografia falha.`);
      }
    });

  return (
    <div className="space-y-4">
      <RealSeal />
      <Callout tone="warn">Crie uma frase de TESTE. Não digite nenhuma senha que você use de verdade.</Callout>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Frase-senha de teste do sistema" htmlFor="st-pass" hint={`Salt aleatório (não secreto): ${toHex(salt)}`}>
          <TextInput id="st-pass" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" />
        </Field>
        <Button icon={Lock} onClick={protect} loading={busy === 'enc'}>
          Cifrar e gravar no banco
        </Button>
      </div>
      {fp && (
        <p className="text-sm text-amber-200">
          <KeyRound className="mr-1 inline h-4 w-4" /> Chave AES-256 derivada · impressão digital <code>{fp}</code>
        </p>
      )}
      <Status msg={msg} />

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <div className="flex flex-wrap gap-1 border-b border-slate-700 bg-slate-950/60 p-1.5">
          {(
            [
              ['db', 'O que fica gravado no banco', Database],
              ['app', 'Aplicativo com a chave', LockOpen],
              ['leak', 'Invasor após vazamento', Skull],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold', view === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Observações (coluna protegida)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ROWS.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-slate-400">{r.id}</td>
                  <td className="px-3 py-2 text-slate-200">{r.cliente}</td>
                  <td className="px-3 py-2">
                    {!db ? (
                      <span className="text-amber-200">
                        {r.obs} <Badge tone="amber">sem proteção</Badge>
                      </span>
                    ) : view === 'app' && appRows ? (
                      <span className="text-emerald-200">{appRows[i]}</span>
                    ) : (
                      <span className={cx('break-all font-mono text-xs', view === 'leak' ? 'text-rose-200' : 'text-cyan-200')}>{db[i].obs}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="success" icon={LockOpen} onClick={openApp} loading={busy === 'app'} disabled={!db}>
          Ler como aplicativo autorizado
        </Button>
      </div>
      <div className="grid gap-2 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Simular vazamento: senha que o invasor tenta" htmlFor="st-leak">
          <TextInput id="st-leak" value={leakPass} onChange={(e) => setLeakPass(e.target.value)} autoComplete="off" />
        </Field>
        <Button variant="danger" icon={DatabaseZap} onClick={leak} loading={busy === 'leak'} disabled={!db}>
          Invasor tenta ler o banco
        </Button>
      </div>
      <Callout title="Por que PBKDF2 e salt?">
        Senhas humanas são curtas e previsíveis. O PBKDF2 repete o cálculo centenas de milhares de vezes, deixando cada tentativa de adivinhação lenta para o atacante, e
        o salt aleatório faz com que a mesma senha gere chaves diferentes em sistemas diferentes. Em sistemas reais, a chave costuma ficar em um cofre de chaves (KMS/HSM),
        separada do banco de dados. A geração, o armazenamento, a troca e a substituição das chaves devem seguir um processo de gerenciamento de chaves <Cite c="NIST, 2020" />.
      </Callout>
    </div>
  );
}
