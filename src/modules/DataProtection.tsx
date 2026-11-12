import { useEffect, useState, type ReactNode } from 'react';
import {
  Building2,
  CheckCircle2,
  Database,
  Fingerprint,
  KeyRound,
  KeySquare,
  Lock,
  LockOpen,
  RefreshCw,
  Scale,
  ShieldCheck,
  Skull,
  UserLock,
  Wand2,
} from 'lucide-react';
import {
  aesDecrypt,
  aesEncrypt,
  generateAesKey,
  generateRsaKeyPair,
  hybridEncrypt,
  keyFingerprint,
  sha256Hex,
  unwrapAesKey,
  type HybridPackage,
} from '../lib/crypto';
import { fromUtf8, toBase64 } from '../lib/encoding';
import { generateFakeRecord, mutateOneDigit, recordToText, type FakeRecord } from '../lib/fakeData';
import { useLab } from '../store';
import { LGPD_QUESTIONS, STEP_QUESTIONS } from '../data/questions';
import { Badge, Button, Callout, Card, Cite, Flow, Output, PageHeader, Question, RealSeal, Select, Status, cx, useAction } from '../components/ui';
import { HashCompare } from '../components/tools/ShaTool';

type AesField = 'nome' | 'telefone' | 'endereco';
interface EncState {
  iv: Uint8Array<ArrayBuffer>;
  ct: Uint8Array<ArrayBuffer>;
  dec?: string;
}

const REC_KEY = 'criptolab:record';
function loadRecord(): FakeRecord {
  try {
    const r = sessionStorage.getItem(REC_KEY);
    if (r) return JSON.parse(r);
  } catch {
    /* ignore */
  }
  // Um novo cadastro fictício é gerado automaticamente a cada execução (sessão).
  const rec = generateFakeRecord();
  try {
    sessionStorage.setItem(REC_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  return rec;
}

function Step({ n, title, done, children, icon: Icon }: { n: number; title: string; done: boolean; children: ReactNode; icon: typeof Lock }) {
  return (
    <Card
      id={`etapa-${n}`}
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-cyan-300">Etapa {n}</span> {title}
          {done && <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-label="concluída" />}
        </span>
      }
      icon={Icon}
    >
      {children}
    </Card>
  );
}

export default function DataProtection() {
  const { state, mark, addLog } = useLab();
  const m = state.milestones;
  const { busy, msg, run } = useAction();
  const [rec, setRec] = useState<FakeRecord>(loadRecord);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [fp, setFp] = useState('');
  const [enc, setEnc] = useState<Partial<Record<AesField, EncState>>>({});
  const [algo, setAlgo] = useState('');
  const [rgHash, setRgHash] = useState('');
  const [rgMod, setRgMod] = useState('');
  const [rgModHash, setRgModHash] = useState('');
  const [compared, setCompared] = useState(false);

  // Criptografia híbrida
  const [hAes, setHAes] = useState<{ key: CryptoKey; fp: string } | null>(null);
  const [hData, setHData] = useState<{ iv: Uint8Array<ArrayBuffer>; ct: Uint8Array<ArrayBuffer> } | null>(null);
  const [hRsa, setHRsa] = useState<CryptoKeyPair | null>(null);
  const [hPkg, setHPkg] = useState<HybridPackage | null>(null);
  const [hRecovered, setHRecovered] = useState<{ key: CryptoKey; fp: string } | null>(null);
  const [hPlain, setHPlain] = useState('');
  const hStage = hPlain ? 6 : hRecovered ? 5 : hPkg ? 4 : hRsa ? 3 : hData ? 2 : hAes ? 1 : 0;

  const log = (technique: string, action: string, input?: string, output?: string, ok = true) =>
    addLog({ module: 'protecao', technique, action, input, output, ok });

  const newRecord = () => {
    const r = generateFakeRecord();
    setRec(r);
    try {
      sessionStorage.setItem(REC_KEY, JSON.stringify(r));
    } catch {
      /* ignore */
    }
    setEnc({});
    setRgHash('');
    setRgMod('');
    setRgModHash('');
    setHAes(null);
    setHData(null);
    setHRsa(null);
    setHPkg(null);
    setHRecovered(null);
    setHPlain('');
    setCompared(false);
  };

  const ensureKey = async () => {
    if (key) return key;
    const k = await generateAesKey(true);
    setKey(k);
    setFp(await keyFingerprint(k));
    log('AES-256-GCM', 'Chave da empresa gerada (valor não registrado)');
    return k;
  };

  const encField = (f: AesField) =>
    run(`enc-${f}`, async () => {
      if (f === 'nome' && algo && algo !== 'AES-256-GCM') throw new Error('Para a Etapa 1, selecione AES-256-GCM: o nome precisa ser recuperado depois.');
      const k = await ensureKey();
      const { iv, ciphertext } = await aesEncrypt(k, rec[f]);
      setEnc((e) => ({ ...e, [f]: { iv, ct: ciphertext } }));
      log('AES-256-GCM', `Criptografia do campo ${f}`, rec[f], toBase64(ciphertext));
      if (f === 'telefone') mark('prot:etapa2');
      return `Campo “${f}” criptografado com AES-256-GCM.`;
    });

  const decField = (f: AesField) =>
    run(`dec-${f}`, async () => {
      const e = enc[f];
      if (!e || !key) throw new Error('Criptografe o campo primeiro.');
      const dec = fromUtf8(await aesDecrypt(key, e.iv, e.ct));
      setEnc((x) => ({ ...x, [f]: { ...e, dec } }));
      log('AES-256-GCM', `Descriptografia do campo ${f}`, toBase64(e.ct), dec);
      if (dec === rec[f]) {
        if (f === 'nome') mark('prot:etapa1');
        if (f === 'endereco') mark('prot:etapa4');
      }
      return dec === rec[f] ? 'Descriptografado: o resultado é idêntico ao dado original.' : 'Descriptografado.';
    });

  const hashRg = () =>
    run('rg1', async () => {
      const h = await sha256Hex(rec.rg);
      setRgHash(h);
      setRgMod(mutateOneDigit(rec.rg));
      setRgModHash('');
      log('SHA-256', 'Hash do RG fictício', rec.rg, h);
      return 'Hash SHA-256 do RG gerado.';
    });

  const hashRgMod = () =>
    run('rg2', async () => {
      if (!/^[\d.\-]+$/.test(rgMod)) throw new Error('Use apenas números, pontos e traço no RG modificado.');
      const h = await sha256Hex(rgMod);
      setRgModHash(h);
      log('SHA-256', 'Hash do RG com um número alterado', rgMod, h);
      if (rgMod !== rec.rg) mark('prot:etapa3');
      return rgMod === rec.rg ? 'O RG não foi alterado: os hashes são iguais.' : 'Novo hash gerado. Compare os resultados.';
    });

  const fullText = recordToText(rec);

  const h1 = () =>
    run('h1', async () => {
      const k = await generateAesKey(true);
      setHAes({ key: k, fp: await keyFingerprint(k) });
      setHData(null);
      setHRsa(null);
      setHPkg(null);
      setHRecovered(null);
      setHPlain('');
      log('Criptografia híbrida', '1. Chave AES de sessão gerada');
      return '1. Chave AES-256 gerada.';
    });
  const h2 = () =>
    run('h2', async () => {
      const { iv, ciphertext } = await aesEncrypt(hAes!.key, fullText);
      setHData({ iv, ct: ciphertext });
      log('Criptografia híbrida', '2. Cadastro completo cifrado com AES-256-GCM', fullText, toBase64(ciphertext));
      return `2. Cadastro completo cifrado (${ciphertext.length} bytes) — note que é maior do que o limite de 190 bytes do RSA.`;
    });
  const h3 = () =>
    run('h3', async () => {
      setHRsa(await generateRsaKeyPair());
      log('Criptografia híbrida', '3. Par de chaves RSA-OAEP gerado (chave privada não registrada)');
      return '3. Par de chaves RSA-2048 gerado.';
    });
  const h4 = () =>
    run('h4', async () => {
      // Reaproveita a chave AES e o texto já cifrados: wrapKey protege a chave AES com a chave pública RSA.
      const pkg = await hybridEncrypt(hRsa!.publicKey, fullText, hAes!.key);
      setHPkg({ ...pkg, iv: hData!.iv, ciphertext: hData!.ct });
      log('Criptografia híbrida', '4. Chave AES protegida com a chave pública RSA', undefined, toBase64(pkg.wrappedKey));
      return '4. A chave AES foi cifrada com a chave PÚBLICA RSA (256 bytes). Agora ela pode ser armazenada ou enviada com segurança.';
    });
  const h5 = () =>
    run('h5', async () => {
      const k = await unwrapAesKey(hRsa!.privateKey, hPkg!.wrappedKey);
      const f = await keyFingerprint(k);
      setHRecovered({ key: k, fp: f });
      log('Criptografia híbrida', '5. Chave AES recuperada com a chave privada RSA', undefined, `impressão digital ${f}`, f === hAes!.fp);
      return f === hAes!.fp ? '5. Chave AES recuperada com a chave PRIVADA RSA — a impressão digital é idêntica à original.' : 'Chave recuperada, mas diferente.';
    });
  const h6 = () =>
    run('h6', async () => {
      const pt = fromUtf8(await aesDecrypt(hRecovered!.key, hPkg!.iv, hPkg!.ciphertext));
      setHPlain(pt);
      log('Criptografia híbrida', '6. Cadastro descriptografado com a chave AES recuperada', toBase64(hPkg!.ciphertext), pt, pt === fullText);
      if (pt === fullText) mark('prot:etapa5');
      return '6. Cadastro recuperado integralmente!';
    });

  const lgpdAnswered = LGPD_QUESTIONS.every((_, i) => (state.answers[`lgpd:q${i + 1}`] ?? '').trim().length >= 10);
  useEffect(() => {
    if (lgpdAnswered) mark('prot:etapa7');
  }, [lgpdAnswered, mark]);

  const allPrev = ['prot:etapa1', 'prot:etapa2', 'prot:etapa3', 'prot:etapa4', 'prot:etapa5'].every((x) => m[x]);

  /* ---------- Linhas da tabela (4.2) ---------- */
  const rows: { campo: string; valor: string; tecnica: string; field?: AesField; kind: 'aes' | 'hash' | 'hybrid' }[] = [
    { campo: 'Nome', valor: rec.nome, tecnica: 'AES-256-GCM', field: 'nome', kind: 'aes' },
    { campo: 'Telefone', valor: rec.telefone, tecnica: 'AES-256-GCM', field: 'telefone', kind: 'aes' },
    { campo: 'RG', valor: rec.rg, tecnica: 'SHA-256', kind: 'hash' },
    { campo: 'Endereço', valor: rec.endereco, tecnica: 'AES-256-GCM', field: 'endereco', kind: 'aes' },
    { campo: 'Cadastro completo', valor: 'Todos os campos', tecnica: 'Criptografia híbrida AES + RSA', kind: 'hybrid' },
  ];

  const resultOf = (r: (typeof rows)[number]): string => {
    if (r.kind === 'aes') {
      const e = enc[r.field!];
      return e ? toBase64(e.ct) : '';
    }
    if (r.kind === 'hash') return rgHash;
    return hData ? toBase64(hData.ct) : '';
  };

  const explanation: Record<string, string> = {
    'AES-256-GCM': 'Simétrica e reversível: a mesma chave secreta cifra e decifra. Protege o sigilo e detecta alterações.',
    'SHA-256': 'Hash irreversível: permite comparar/verificar o RG sem guardá-lo legível, mas não permite recuperá-lo.',
    'Criptografia híbrida AES + RSA': 'O AES cifra os dados (rápido); o RSA protege só a chave AES (resolve a troca de chaves).',
  };

  const aesButtons = (f: AesField) => (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" icon={Lock} onClick={() => encField(f)} loading={busy === `enc-${f}`}>
        Criptografar
      </Button>
      <Button size="sm" variant="success" icon={LockOpen} onClick={() => decField(f)} loading={busy === `dec-${f}`} disabled={!enc[f]}>
        Descriptografar
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader icon={UserLock} kicker="Módulo 7 · Prática" title="Proteção de dados pessoais na prática">
        Você faz parte da equipe de segurança de uma empresa. Sua missão é aplicar técnicas criptográficas para proteger os dados de clientes e entender o que acontece
        quando essas informações ficam armazenadas sem proteção.
      </PageHeader>

      <Callout tone="info" title="Cenário">
        “Uma empresa possui um sistema que armazena informações de seus clientes. A equipe de segurança precisa aplicar técnicas criptográficas para proteger os dados e
        compreender o que acontece quando essas informações são armazenadas sem proteção.”
      </Callout>

      {/* 4.1 Dados fictícios */}
      <Card
        title="Cadastro de cliente"
        icon={Building2}
        actions={
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={newRecord}>
            Gerar novo cadastro fictício
          </Button>
        }
      >
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-amber-400/50 bg-amber-400/5 p-4">
          <span className="absolute right-3 top-3 rotate-6 rounded-md border-2 border-amber-300 px-2 py-0.5 text-xs font-black tracking-widest text-amber-300">
            FICTÍCIO
          </span>
          <dl className="grid gap-2 pt-7 text-sm sm:grid-cols-2 sm:pt-0">
            {(
              [
                ['Nome', rec.nome],
                ['Telefone', rec.telefone],
                ['RG', rec.rg],
                ['Endereço', rec.endereco],
                ['E-mail', rec.email],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">{k}</dt>
                <dd className="font-mono text-amber-50">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Dados gerados automaticamente para esta atividade. Os campos não podem ser editados:{' '}
          <strong className="text-slate-200">não utilize seus próprios dados pessoais, RG, telefone ou endereço</strong>.
        </p>
      </Card>

      {/* 4.2 Tabela */}
      <Card title="Painel de proteção dos campos" icon={ShieldCheck} subtitle="Aplique a técnica indicada a cada campo. As etapas abaixo guiam a atividade passo a passo.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <RealSeal />
          {key && (
            <Badge tone="amber">
              <KeyRound className="h-3 w-3" /> Chave AES da empresa · {fp}
            </Badge>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 pr-3">Campo</th>
                <th className="py-2 pr-3">Informação fictícia</th>
                <th className="py-2 pr-3">Técnica</th>
                <th className="py-2 pr-3">Ações</th>
                <th className="py-2">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 align-top">
              {rows.map((r) => (
                <tr key={r.campo}>
                  <td className="py-3 pr-3 font-semibold text-white">{r.campo}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-amber-100">{r.valor}</td>
                  <td className="py-3 pr-3">
                    <Badge tone={r.kind === 'hash' ? 'amber' : r.kind === 'hybrid' ? 'violet' : 'cyan'}>{r.tecnica}</Badge>
                    <p className="mt-1 max-w-[16rem] text-xs text-slate-400">{explanation[r.tecnica]}</p>
                  </td>
                  <td className="py-3 pr-3">
                    {r.kind === 'aes' && aesButtons(r.field!)}
                    {r.kind === 'hash' && (
                      <Button size="sm" icon={Fingerprint} onClick={hashRg} loading={busy === 'rg1'}>
                        Gerar hash
                      </Button>
                    )}
                    {r.kind === 'hybrid' && (
                      <a href="#etapa-5" onClick={(e) => { e.preventDefault(); document.getElementById('etapa-5')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-xs font-semibold text-cyan-300 hover:underline">
                        Executar na Etapa 5 ↓
                      </a>
                    )}
                  </td>
                  <td className="max-w-[18rem] py-3">
                    <p className="break-all font-mono text-[11px] text-cyan-200">{resultOf(r) ? `${resultOf(r).slice(0, 64)}${resultOf(r).length > 64 ? '…' : ''}` : '—'}</p>
                    {r.field && enc[r.field]?.dec && <p className="mt-1 text-xs text-emerald-300">↺ {enc[r.field]!.dec}</p>}
                    {r.kind === 'hybrid' && hPlain && <p className="mt-1 text-xs text-emerald-300">↺ recuperado</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Versão em cartões para celular */}
        <div className="space-y-3 md:hidden">
          {rows.map((r) => (
            <div key={r.campo} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-white">{r.campo}</p>
                <Badge tone={r.kind === 'hash' ? 'amber' : r.kind === 'hybrid' ? 'violet' : 'cyan'}>{r.tecnica}</Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-amber-100">{r.valor}</p>
              <p className="mt-1 text-xs text-slate-400">{explanation[r.tecnica]}</p>
              <div className="mt-2">
                {r.kind === 'aes' && aesButtons(r.field!)}
                {r.kind === 'hash' && (
                  <Button size="sm" icon={Fingerprint} onClick={hashRg} loading={busy === 'rg1'}>
                    Gerar hash
                  </Button>
                )}
                {r.kind === 'hybrid' && <p className="text-xs text-cyan-300">Execute na Etapa 5, abaixo.</p>}
              </div>
              {resultOf(r) && <p className="mt-2 break-all font-mono text-[11px] text-cyan-200">{resultOf(r).slice(0, 64)}…</p>}
              {r.field && enc[r.field]?.dec && <p className="mt-1 text-xs text-emerald-300">↺ {enc[r.field]!.dec}</p>}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Status msg={msg} />
        </div>
      </Card>

      {/* Etapa 1 */}
      <Step n={1} title="Criptografia do nome" done={!!m['prot:etapa1']} icon={Lock}>
        <ol className="mb-4 grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
          {['Visualize o nome fictício.', 'Selecione AES-256-GCM.', 'Execute a criptografia.', 'Observe o texto cifrado.', 'Execute a descriptografia.', 'Compare o resultado com o original.'].map(
            (t, i) => (
              <li key={t}>
                <span className="font-mono text-cyan-300">{i + 1}.</span> {t}
              </li>
            ),
          )}
        </ol>
        <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
          <Output label="1. Nome fictício (original)" value={rec.nome} mono={false} tone="amber" />
          <div className="space-y-1">
            <label htmlFor="algo" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. Técnica
            </label>
            <Select id="algo" value={algo} onChange={(e) => setAlgo(e.target.value)}>
              <option value="">Selecione…</option>
              <option>AES-256-GCM</option>
              <option>SHA-256</option>
              <option>Cifra de César</option>
            </Select>
            {algo && algo !== 'AES-256-GCM' && (
              <p className="text-xs text-rose-300">
                {algo === 'SHA-256' ? 'Hash não permite recuperar o nome depois. Escolha uma técnica reversível.' : 'A Cifra de César é didática e não protege dados reais.'}
              </p>
            )}
            {algo === 'AES-256-GCM' && <p className="text-xs text-emerald-300">Boa escolha: AES é reversível com a chave.</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon={Lock} onClick={() => encField('nome')} loading={busy === 'enc-nome'} disabled={algo !== 'AES-256-GCM'}>
            3. Criptografar
          </Button>
          <Button variant="success" icon={LockOpen} onClick={() => decField('nome')} loading={busy === 'dec-nome'} disabled={!enc.nome}>
            5. Descriptografar
          </Button>
        </div>
        {enc.nome && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Output label="4. Texto cifrado (Base64)" value={toBase64(enc.nome.ct)} tone="cyan" />
            {enc.nome.dec !== undefined && (
              <Output
                label={`6. Comparação: ${enc.nome.dec === rec.nome ? 'IDÊNTICO ao original ✓' : 'diferente'}`}
                value={enc.nome.dec}
                tone={enc.nome.dec === rec.nome ? 'emerald' : 'rose'}
                mono={false}
              />
            )}
          </div>
        )}
        <div className="mt-4">
          <Question id="prot:q1" prompt={STEP_QUESTIONS['prot:q1']} />
        </div>
      </Step>

      {/* Etapa 2 */}
      <Step n={2} title="Criptografia do telefone" done={!!m['prot:etapa2']} icon={Lock}>
        <p className="mb-3 text-sm text-slate-300">Criptografe o telefone fictício com AES-256-GCM e veja como ele ficaria gravado no banco de dados.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Output label="Telefone (original)" value={rec.telefone} tone="amber" />
          <Output label="Como fica no banco de dados" value={enc.telefone ? toBase64(enc.telefone.ct) : ''} tone="cyan" />
        </div>
        <div className="mt-3">{aesButtons('telefone')}</div>
        {enc.telefone?.dec && <p className="mt-2 text-sm text-emerald-300">Com a chave da empresa: {enc.telefone.dec}</p>}
        <div className="mt-4">
          <Question id="prot:q2" prompt={STEP_QUESTIONS['prot:q2']} />
        </div>
      </Step>

      {/* Etapa 3 */}
      <Step n={3} title="Hash do RG" done={!!m['prot:etapa3']} icon={Fingerprint}>
        <ol className="mb-3 grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
          {['Visualize o RG fictício.', 'Gere seu hash SHA-256.', 'Altere um número do RG.', 'Gere novamente o hash.', 'Compare os resultados.'].map((t, i) => (
            <li key={t}>
              <span className="font-mono text-cyan-300">{i + 1}.</span> {t}
            </li>
          ))}
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <Output label="RG fictício" value={rec.rg} tone="amber" />
          <Output label="SHA-256 do RG" value={rgHash} tone="cyan" />
        </div>
        <div className="mt-3">
          <Button icon={Fingerprint} onClick={hashRg} loading={busy === 'rg1'}>
            Gerar hash SHA-256
          </Button>
        </div>
        {rgHash && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="rgmod" className="text-sm font-medium text-slate-200">
                RG com um número alterado
              </label>
              <input
                id="rgmod"
                value={rgMod}
                onChange={(e) => setRgMod(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <Button variant="secondary" icon={Wand2} onClick={() => setRgMod(mutateOneDigit(rec.rg))}>
              Sortear outro dígito
            </Button>
            <Button icon={Fingerprint} onClick={hashRgMod} loading={busy === 'rg2'}>
              Gerar novo hash
            </Button>
          </div>
        )}
        {rgHash && rgModHash && (
          <div className="mt-3">
            <HashCompare a={rgHash} b={rgModHash} labelA={`SHA-256 de ${rec.rg}`} labelB={`SHA-256 de ${rgMod}`} />
          </div>
        )}
        <div className="mt-3 space-y-2">
          <Callout tone="warn" title="SHA-256 é hash, não criptografia">
            O SHA-256 é uma função de hash <Cite c="NIST, 2015" />: não usa chave, não permite recuperar o RG original e, portanto, <strong>não substitui a
            criptografia</strong> quando a empresa precisa ler o dado novamente. Ele é útil para verificar se um RG informado confere com o cadastrado, sem guardar o número
            legível.
          </Callout>
          <Callout tone="info" title="Cuidado extra">
            Como um RG tem poucos dígitos, um atacante poderia calcular o hash de todas as combinações possíveis e descobrir o número. Por isso, sistemas reais combinam o
            hash com um segredo (por exemplo, HMAC) ou um salt. O hash simples do RG é uma forma de pseudonimização, não de anonimização.
          </Callout>
        </div>
        <div className="mt-4">
          <Question id="prot:q3" prompt={STEP_QUESTIONS['prot:q3']} />
        </div>
      </Step>

      {/* Etapa 4 */}
      <Step n={4} title="Criptografia do endereço" done={!!m['prot:etapa4']} icon={Lock}>
        <div className="grid gap-3 md:grid-cols-3">
          <Output label="Endereço original" value={rec.endereco} tone="amber" mono={false} />
          <Output label="Texto cifrado" value={enc.endereco ? toBase64(enc.endereco.ct) : ''} tone="cyan" />
          <Output label="Após descriptografia" value={enc.endereco?.dec ?? ''} tone="emerald" mono={false} />
        </div>
        {enc.endereco && (
          <p className="mt-2 text-xs text-slate-400">
            Original: {new TextEncoder().encode(rec.endereco).length} bytes → cifrado: {enc.endereco.ct.length} bytes (mesmo tamanho + 16 bytes da etiqueta de
            autenticação).
          </p>
        )}
        <div className="mt-3">{aesButtons('endereco')}</div>
        <div className="mt-4">
          <Question id="prot:q4" prompt={STEP_QUESTIONS['prot:q4']} />
        </div>
      </Step>

      {/* Etapa 5 */}
      <Step n={5} title="Criptografia híbrida (AES + RSA)" done={!!m['prot:etapa5']} icon={KeySquare}>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fluxo</p>
          <Flow
            compact
            steps={[
              { label: 'Cadastro', tone: 'slate', active: hStage === 2 },
              { label: 'AES-256-GCM', tone: 'amber', icon: KeyRound, active: hStage === 2 },
              { label: 'Dados cifrados', tone: 'cyan', icon: Lock, sub: hData ? toBase64(hData.ct).slice(0, 18) + '…' : undefined, active: hStage === 2 },
            ]}
          />
          <Flow
            compact
            steps={[
              { label: 'Chave AES', tone: 'amber', icon: KeyRound, sub: hAes?.fp, active: hStage === 4 },
              { label: 'RSA com chave pública', tone: 'emerald', icon: Lock, active: hStage === 4 },
              { label: 'Chave AES protegida', tone: 'cyan', sub: hPkg ? toBase64(hPkg.wrappedKey).slice(0, 18) + '…' : undefined, active: hStage === 4 },
            ]}
          />
          <Flow
            compact
            steps={[
              { label: 'Chave privada RSA', tone: 'rose', icon: KeyRound, active: hStage === 5 },
              { label: 'Recuperação da chave AES', tone: 'amber', sub: hRecovered?.fp, active: hStage === 5 },
              { label: 'Descriptografia do cadastro', tone: 'emerald', icon: LockOpen, active: hStage === 6 },
            ]}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              [1, 'Gerar uma chave AES', h1, true],
              [2, 'Criptografar o cadastro completo (AES-256-GCM)', h2, hStage >= 1],
              [3, 'Gerar um par de chaves RSA-OAEP', h3, hStage >= 2],
              [4, 'Proteger a chave AES com a chave pública RSA', h4, hStage >= 3],
              [5, 'Recuperar a chave AES com a chave privada RSA', h5, hStage >= 4],
              [6, 'Descriptografar o cadastro com a chave recuperada', h6, hStage >= 5],
            ] as const
          ).map(([n, label, fn, can]) => (
            <button
              key={n}
              onClick={fn}
              disabled={!can || busy !== null}
              className={cx(
                'flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition disabled:opacity-40',
                hStage >= n ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100' : 'border-slate-700 bg-slate-950/50 text-slate-200 hover:border-cyan-400/50',
              )}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-800 font-mono text-xs">{hStage >= n ? '✓' : n}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Status msg={msg} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {hData && <Output label="Cadastro cifrado (AES-256-GCM, Base64)" value={toBase64(hData.ct)} tone="cyan" />}
          {hPkg && <Output label="Chave AES protegida pelo RSA (Base64, 256 bytes)" value={toBase64(hPkg.wrappedKey)} tone="cyan" />}
          {hRecovered && (
            <Output
              label="Impressões digitais: original × recuperada"
              value={`${hAes?.fp}\n${hRecovered.fp}\n${hAes?.fp === hRecovered.fp ? '→ idênticas ✓' : '→ diferentes'}`}
              tone="emerald"
            />
          )}
          {hPlain && <Output label="Cadastro recuperado" value={hPlain} tone="emerald" mono={false} maxH="max-h-48" />}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Implementação real com a Web Crypto API: AES-256-GCM para os dados e RSA-OAEP (wrapKey/unwrapKey) para a chave <Cite c="MORIARTY et al., 2016" />. É o mesmo
          princípio usado para proteger arquivos e mensagens no dia a dia.
        </p>
        <div className="mt-4">
          <Question id="prot:q5" prompt={STEP_QUESTIONS['prot:q5']} />
        </div>
      </Step>

      {/* Etapa 6 */}
      <Step n={6} title="Comparação dos resultados" done={!!m['prot:etapa6']} icon={Database}>
        {!allPrev && <Callout tone="info">Conclua as Etapas 1 a 5 para preencher todos os resultados. Você já pode gerar a comparação parcial.</Callout>}
        <div className="mt-3">
          <Button
            icon={Database}
            onClick={() => {
              setCompared(true);
              if (allPrev) {
                mark('prot:etapa6');
                comparisonRows({ rec, enc, rgHash, hData, hPkg }).forEach((r) =>
                  log(r.tecnica, `Comparação · recuperação: ${r.recuperacao} · finalidade: ${r.finalidade}`, r.original, r.resultado),
                );
              }
            }}
          >
            Gerar comparação
          </Button>
        </div>
        {compared && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Dado original</th>
                  <th className="py-2 pr-3">Técnica aplicada</th>
                  <th className="py-2 pr-3">Resultado criptográfico</th>
                  <th className="py-2 pr-3">Possibilidade de recuperação</th>
                  <th className="py-2">Finalidade da técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 align-top">
                {comparisonRows({ rec, enc, rgHash, hData, hPkg }).map((r) => (
                  <tr key={r.original}>
                    <td className="py-2 pr-3 text-amber-100">{r.original}</td>
                    <td className="py-2 pr-3">{r.tecnica}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-cyan-200 break-all">{r.resultado || '— (não executado)'}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={r.recuperavel ? 'emerald' : 'amber'}>{r.recuperacao}</Badge>
                    </td>
                    <td className="py-2 text-slate-300">{r.finalidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Step>

      {/* Etapa 7 */}
      <Step n={7} title="Reflexão sobre segurança e LGPD" done={!!m['prot:etapa7']} icon={Scale}>
        <Callout tone="danger" title="Incidente de segurança">
          “Uma empresa sofreu um incidente de segurança e um invasor conseguiu acessar seu banco de dados. Entretanto, parte das informações estava protegida por
          criptografia.”
        </Callout>

        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-100">
            <Skull className="h-4 w-4" /> O que o invasor vê no banco de dados copiado
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] font-mono text-[11px]">
              <tbody className="divide-y divide-rose-400/10">
                {(
                  [
                    ['nome', enc.nome ? toBase64(enc.nome.ct) : rec.nome, !!enc.nome],
                    ['telefone', enc.telefone ? toBase64(enc.telefone.ct) : rec.telefone, !!enc.telefone],
                    ['rg_hash', rgHash || rec.rg, !!rgHash],
                    ['endereco', enc.endereco ? toBase64(enc.endereco.ct) : rec.endereco, !!enc.endereco],
                    ['email', rec.email, false],
                  ] as const
                ).map(([col, val, prot]) => (
                  <tr key={col}>
                    <td className="py-1 pr-3 text-slate-400">{col}</td>
                    <td className={cx('py-1 pr-3 break-all', prot ? 'text-cyan-200' : 'text-rose-200')}>{val}</td>
                    <td className="py-1">{prot ? <Badge tone="emerald">protegido</Badge> : <Badge tone="rose">exposto</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-rose-100/80">
            Repare: o e-mail não foi protegido nesta atividade e ficaria exposto. Proteger apenas parte dos dados reduz, mas não elimina, o impacto de um vazamento.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {LGPD_QUESTIONS.map((q, i) => (
            <Question key={q} id={`lgpd:q${i + 1}`} n={i + 1} prompt={q} />
          ))}
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <p className="flex items-center gap-2 font-semibold text-white">
            <Scale className="h-5 w-5 text-cyan-300" /> A Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
          </p>
          <div className="space-y-3 text-sm leading-relaxed text-slate-200">
            <p>
              A LGPD regula o tratamento de dados pessoais por pessoas e organizações, públicas ou privadas, para proteger os direitos de liberdade e de privacidade das
              pessoas naturais <Cite c="BRASIL, 2018" />.
            </p>
            <p>
              <strong>Dado pessoal</strong> é a informação relacionada a uma pessoa natural identificada ou identificável (art. 5º, I). Nome, telefone, RG, endereço e
              e-mail são exemplos de dados pessoais.
            </p>
            <p>
              <strong>Dado pessoal sensível</strong> é uma categoria específica definida no art. 5º, II: origem racial ou étnica, convicção religiosa, opinião política,
              filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dados referentes à saúde ou à vida sexual, e dados genéticos ou
              biométricos, quando vinculados a uma pessoa natural. Portanto, <strong>nome, telefone, RG e endereço não são automaticamente classificados como dados pessoais
              sensíveis</strong> pela definição legal — mas continuam sendo dados pessoais e precisam de proteção.
            </p>
            <p>
              Entre os princípios da lei estão a <strong>segurança</strong> e a <strong>prevenção</strong> (art. 6º, VII e VIII). O art. 46 determina que os agentes de
              tratamento adotem medidas de segurança, técnicas e administrativas, para proteger os dados pessoais de acessos não autorizados e de situações acidentais ou
              ilícitas, como destruição, perda, alteração ou vazamento.
            </p>
            <p>
              Em caso de incidente que possa causar risco ou dano relevante, o controlador deve comunicar a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares
              (art. 48). Ao avaliar a gravidade, considera-se se foram adotadas medidas técnicas que tornem os dados afetados{' '}
              <em>“ininteligíveis […] para terceiros não autorizados a acessá-los”</em> (art. 48, § 3º) — exatamente o que a criptografia faz quando a chave permanece
              protegida <Cite c="BRASIL, 2018" />.
            </p>
            <p>
              A criptografia é uma medida técnica importante, mas não a única: controle de acesso, gestão segura de chaves <Cite c="NIST, 2020" />, autenticação forte,
              atualizações, backups, registro de acessos, minimização de dados, treinamento e um plano de resposta a incidentes também fazem parte da proteção.
            </p>
          </div>
        </div>
      </Step>
    </div>
  );
}

export function comparisonRows({
  rec,
  enc,
  rgHash,
  hData,
  hPkg,
}: {
  rec: FakeRecord;
  enc: Partial<Record<AesField, EncState>>;
  rgHash: string;
  hData: { ct: Uint8Array<ArrayBuffer> } | null;
  hPkg: HybridPackage | null;
}) {
  const t = (s: string) => (s.length > 44 ? `${s.slice(0, 44)}…` : s);
  return [
    {
      original: `Nome: ${rec.nome}`,
      tecnica: 'AES-256-GCM',
      resultado: enc.nome ? t(toBase64(enc.nome.ct)) : '',
      recuperacao: 'Sim, com a chave AES',
      recuperavel: true,
      finalidade: 'Confidencialidade com possibilidade de leitura posterior',
    },
    {
      original: `Telefone: ${rec.telefone}`,
      tecnica: 'AES-256-GCM',
      resultado: enc.telefone ? t(toBase64(enc.telefone.ct)) : '',
      recuperacao: 'Sim, com a chave AES',
      recuperavel: true,
      finalidade: 'Impedir a leitura em caso de acesso indevido ao banco',
    },
    {
      original: `RG: ${rec.rg}`,
      tecnica: 'SHA-256 (hash)',
      resultado: rgHash ? t(rgHash) : '',
      recuperacao: 'Não — o hash é irreversível',
      recuperavel: false,
      finalidade: 'Verificar/comparar o RG sem armazená-lo legível (integridade)',
    },
    {
      original: `Endereço: ${rec.endereco}`,
      tecnica: 'AES-256-GCM',
      resultado: enc.endereco ? t(toBase64(enc.endereco.ct)) : '',
      recuperacao: 'Sim, com a chave AES',
      recuperavel: true,
      finalidade: 'Confidencialidade do dado armazenado',
    },
    {
      original: 'Cadastro completo',
      tecnica: 'Híbrida: AES-256-GCM + RSA-OAEP',
      resultado: hData && hPkg ? t(toBase64(hData.ct)) : '',
      recuperacao: 'Sim, com a chave privada RSA',
      recuperavel: true,
      finalidade: 'Cifrar grandes volumes (AES) e compartilhar a chave com segurança (RSA)',
    },
  ];
}
