// Desafio 60–79: SIMULAÇÃO DIDÁTICA de comunicação segura inspirada no TLS 1.3.
// Cliente e servidor são simulados na mesma página. NENHUMA conexão TLS real é estabelecida.
import { useRef, useState } from 'react';
import { BadgeCheck, Eye, Handshake, KeyRound, Laptop, Send, Server, ShieldAlert, Skull } from 'lucide-react';
import {
  aesDecrypt,
  aesEncrypt,
  deriveSessionKey,
  ecdsaSign,
  ecdsaVerify,
  exportRawPublic,
  generateEcdhKeyPair,
  generateEcdsaKeyPair,
  importEcdhPublic,
  keyFingerprint,
  randomBytes,
  sha256,
} from '../../lib/crypto';
import { concatBytes, fromUtf8, toBase64, toHex, utf8 } from '../../lib/encoding';
import { useLab } from '../../store';
import { Badge, Button, Callout, Cite, DemoSeal, Status, TextInput, cx, useAction } from '../../components/ui';
import type { ChallengeResult } from './types';

interface Wire {
  dir: 'c2s' | 's2c';
  label: string;
  data: string;
  tampered?: boolean;
}

interface Session {
  clientRandom: Uint8Array<ArrayBuffer>;
  serverRandom?: Uint8Array<ArrayBuffer>;
  clientEcdh: CryptoKeyPair;
  serverEcdh?: CryptoKeyPair;
  clientShare: Uint8Array<ArrayBuffer>;
  serverShare?: Uint8Array<ArrayBuffer>;
  caKey?: CryptoKeyPair;
  serverSig?: CryptoKeyPair;
  cert?: Uint8Array<ArrayBuffer>;
  certSig?: Uint8Array<ArrayBuffer>;
  cv?: Uint8Array<ArrayBuffer>;
  transcript?: Uint8Array<ArrayBuffer>;
  clientKey?: CryptoKey;
  serverKey?: CryptoKey;
}

const short = (b: Uint8Array) => `${toHex(b).slice(0, 24)}…`;

export function TlsChallenge({ onResult }: { onResult: (r: ChallengeResult) => void }) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const s = useRef<Session | null>(null);
  const [step, setStep] = useState(0);
  const [wire, setWire] = useState<Wire[]>([]);
  const [verified, setVerified] = useState<{ cert: boolean; cv: boolean } | null>(null);
  const [fps, setFps] = useState<{ c: string; s: string } | null>(null);
  const [text, setText] = useState('Olá, servidor! Minha nota da atividade é 10.');
  const [serverInbox, setServerInbox] = useState<string[]>([]);
  const [lastPacket, setLastPacket] = useState<{ iv: Uint8Array<ArrayBuffer>; ct: Uint8Array<ArrayBuffer> } | null>(null);
  const [intruder, setIntruder] = useState(false);

  const push = (w: Wire) => setWire((x) => [...x, w]);
  const log = (action: string, ok = true, output?: string) => addLog({ module: 'desafio', technique: 'Simulação didática de TLS', action, output, ok });

  const clientHello = () =>
    run('1', async () => {
      const clientEcdh = await generateEcdhKeyPair();
      const clientShare = await exportRawPublic(clientEcdh.publicKey);
      s.current = { clientRandom: randomBytes(32), clientEcdh, clientShare };
      setWire([]);
      setVerified(null);
      setFps(null);
      setServerInbox([]);
      setLastPacket(null);
      push({ dir: 'c2s', label: 'ClientHello · número aleatório do cliente', data: short(s.current.clientRandom) });
      push({ dir: 'c2s', label: 'ClientHello · key_share (chave pública ECDH P-256)', data: short(clientShare) });
      push({ dir: 'c2s', label: 'ClientHello · cifras suportadas (simulado)', data: 'TLS_AES_256_GCM_SHA384, TLS_AES_128_GCM_SHA256' });
      setStep(1);
      log('ClientHello enviado (simulado)');
      return 'Cliente enviou o ClientHello com sua parte da troca de chaves.';
    });

  const serverHello = () =>
    run('2', async () => {
      const ss = s.current!;
      ss.serverRandom = randomBytes(32);
      ss.serverEcdh = await generateEcdhKeyPair();
      ss.serverShare = await exportRawPublic(ss.serverEcdh.publicKey);
      // "Certificado" didático: chave pública de assinatura do servidor + nome, assinados por uma AC didática.
      ss.caKey = await generateEcdsaKeyPair();
      ss.serverSig = await generateEcdsaKeyPair();
      const serverSigPub = await exportRawPublic(ss.serverSig.publicKey);
      ss.cert = concatBytes(utf8('CN=servidor.criptolab.test;'), serverSigPub);
      ss.certSig = await ecdsaSign(ss.caKey.privateKey, ss.cert);
      ss.transcript = concatBytes(ss.clientRandom, ss.clientShare, ss.serverRandom, ss.serverShare, ss.cert);
      ss.cv = await ecdsaSign(ss.serverSig.privateKey, await sha256(ss.transcript));
      push({ dir: 's2c', label: 'ServerHello · número aleatório do servidor', data: short(ss.serverRandom) });
      push({ dir: 's2c', label: 'ServerHello · key_share (chave pública ECDH P-256)', data: short(ss.serverShare) });
      push({ dir: 's2c', label: 'Certificate (didático) · CN=servidor.criptolab.test', data: short(ss.cert) });
      push({ dir: 's2c', label: 'CertificateVerify · assinatura ECDSA do transcript', data: short(ss.cv) });
      setStep(2);
      log('ServerHello, certificado didático e assinatura enviados (simulado)');
      return 'Servidor respondeu com sua parte da troca de chaves, um certificado didático e uma assinatura.';
    });

  const verify = () =>
    run('3', async () => {
      const ss = s.current!;
      const certOk = await ecdsaVerify(ss.caKey!.publicKey, ss.certSig!, ss.cert!);
      const cvOk = await ecdsaVerify(ss.serverSig!.publicKey, ss.cv!, await sha256(ss.transcript!));
      setVerified({ cert: certOk, cv: cvOk });
      setStep(3);
      log(`Cliente verificou certificado (${certOk ? 'válido' : 'inválido'}) e assinatura (${cvOk ? 'válida' : 'inválida'})`, certOk && cvOk);
      if (!certOk || !cvOk) throw new Error('Verificação falhou: o cliente encerraria a conexão.');
      return 'Assinaturas válidas: o cliente confia que está falando com “servidor.criptolab.test” (autenticidade).';
    });

  const derive = () =>
    run('4', async () => {
      const ss = s.current!;
      const salt = await sha256(ss.transcript!);
      const c = await deriveSessionKey(ss.clientEcdh.privateKey, await importEcdhPublic(ss.serverShare!), salt);
      const sv = await deriveSessionKey(ss.serverEcdh!.privateKey, await importEcdhPublic(ss.clientShare), salt);
      ss.clientKey = c.key;
      ss.serverKey = sv.key;
      const f = { c: await keyFingerprint(c.key), s: await keyFingerprint(sv.key) };
      setFps(f);
      setStep(4);
      log('Chaves de sessão derivadas (ECDH + HKDF) — valores não registrados', f.c === f.s, `Impressões digitais: cliente ${f.c} / servidor ${f.s}`);
      return f.c === f.s ? 'Cliente e servidor calcularam a MESMA chave de sessão, sem que ela tenha passado pela rede.' : 'As chaves não conferem.';
    });

  const send = () =>
    run('5', async () => {
      const ss = s.current!;
      if (!text.trim()) throw new Error('Digite uma mensagem.');
      const { iv, ciphertext } = await aesEncrypt(ss.clientKey!, text);
      setLastPacket({ iv, ct: ciphertext });
      push({ dir: 'c2s', label: 'Application Data (AES-256-GCM)', data: toBase64(ciphertext) });
      const plain = fromUtf8(await aesDecrypt(ss.serverKey!, iv, ciphertext));
      setServerInbox((x) => [...x, plain]);
      setStep(5);
      mark('desafio:execucao');
      log('Mensagem cifrada enviada e decifrada pelo servidor', true, toBase64(ciphertext));
      onResult({
        mensagem: text,
        resultado: `Handshake simulado (ECDH P-256 + HKDF-SHA-256, certificado didático ECDSA). Chave de sessão idêntica nos dois lados (impressão digital ${fps?.c ?? ''}). Mensagem trafegou cifrada: ${toBase64(ciphertext).slice(0, 48)}…`,
      });
      return 'O servidor recebeu e decifrou a mensagem. Na rede, só trafegou texto cifrado.';
    });

  const tamper = () =>
    run('t', async () => {
      const ss = s.current!;
      if (!lastPacket) throw new Error('Envie uma mensagem primeiro.');
      const bad = lastPacket.ct.slice();
      bad[0] ^= 0xff;
      push({ dir: 'c2s', label: 'Application Data ALTERADO pelo intruso', data: toBase64(bad), tampered: true });
      try {
        await aesDecrypt(ss.serverKey!, lastPacket.iv, bad);
        return 'Inesperado: o pacote alterado foi aceito.';
      } catch {
        log('Pacote adulterado rejeitado pelo servidor', false);
        throw new Error('Resultado esperado — o servidor REJEITOU o pacote: a etiqueta de autenticação do AES-GCM não confere (integridade).');
      }
    });

  const stepsUi = [
    { n: 1, label: 'ClientHello', icon: Laptop, action: clientHello, can: true },
    { n: 2, label: 'ServerHello + certificado', icon: Server, action: serverHello, can: step >= 1 },
    { n: 3, label: 'Verificar certificado', icon: BadgeCheck, action: verify, can: step >= 2 },
    { n: 4, label: 'Derivar chave de sessão', icon: KeyRound, action: derive, can: step >= 3 },
  ];

  return (
    <div className="space-y-4">
      <DemoSeal>
        <strong>Simulação didática de comunicação segura.</strong> O cliente e o servidor são simulados nesta mesma página e <strong>nenhuma conexão TLS real é
        estabelecida</strong>. As peças criptográficas usadas (ECDH, HKDF, ECDSA e AES-GCM) são reais, da Web Crypto API, mas o protocolo foi simplificado para estudo. O TLS
        1.3 real é definido na RFC 8446 <Cite c="RESCORLA, 2018" />.
      </DemoSeal>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stepsUi.map((x) => (
          <button
            key={x.n}
            onClick={x.action}
            disabled={!x.can || busy !== null}
            className={cx(
              'flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition disabled:opacity-40',
              step >= x.n ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100' : 'border-slate-700 bg-slate-950/50 text-slate-200 hover:border-cyan-400/50',
            )}
          >
            <x.icon className="h-5 w-5 shrink-0" />
            <span>
              <span className="block font-mono text-[11px] opacity-70">Etapa {x.n}</span>
              <span className="font-semibold">{x.label}</span>
            </span>
          </button>
        ))}
      </div>
      <Status msg={msg} />

      {verified && (
        <div className="flex flex-wrap gap-2">
          <Badge tone={verified.cert ? 'emerald' : 'rose'}>Certificado assinado pela AC didática: {verified.cert ? 'válido' : 'inválido'}</Badge>
          <Badge tone={verified.cv ? 'emerald' : 'rose'}>Assinatura do servidor: {verified.cv ? 'válida' : 'inválida'}</Badge>
        </div>
      )}
      {fps && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3 text-sm">
            <Laptop className="mr-1 inline h-4 w-4" /> Chave do cliente: <code className="text-cyan-200">{fps.c}</code>
          </div>
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3 text-sm">
            <Server className="mr-1 inline h-4 w-4" /> Chave do servidor: <code className="text-cyan-200">{fps.s}</code>
          </div>
        </div>
      )}

      {step >= 4 && (
        <div className="space-y-3 rounded-xl border border-slate-700 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Handshake className="h-4 w-4 text-emerald-300" /> Canal protegido estabelecido (simulação)
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput aria-label="Mensagem do cliente" value={text} onChange={(e) => setText(e.target.value)} />
            <Button icon={Send} onClick={send} loading={busy === '5'}>
              Enviar
            </Button>
          </div>
          {serverInbox.length > 0 && (
            <div className="rounded-lg bg-slate-950/60 p-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Servidor recebeu (após decifrar)</p>
              {serverInbox.map((m, i) => (
                <p key={i} className="text-emerald-200">
                  “{m}”
                </p>
              ))}
            </div>
          )}
          {lastPacket && (
            <Button size="sm" variant="danger" icon={Skull} onClick={tamper} loading={busy === 't'}>
              Intruso altera o último pacote
            </Button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-100">
            <Eye className="h-4 w-4" /> Visão de um intruso na rede ({wire.length} mensagens)
          </p>
          <Button size="sm" variant="ghost" onClick={() => setIntruder((v) => !v)}>
            {intruder ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
        {intruder && (
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto font-mono text-[11px]">
            {wire.length === 0 && <li className="text-slate-500">Nada trafegou ainda.</li>}
            {wire.map((w, i) => (
              <li key={i} className={cx('rounded px-2 py-1', w.tampered ? 'bg-rose-500/20 text-rose-100' : 'bg-slate-950/60 text-slate-300')}>
                <span className="text-slate-500">{w.dir === 'c2s' ? 'cliente → servidor' : 'servidor → cliente'}</span> · {w.label}
                <br />
                <span className="break-all">{w.data}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-rose-100/70">
          <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
          O intruso vê as chaves PÚBLICAS e o texto cifrado, mas não as chaves privadas nem a chave de sessão — por isso não consegue ler as mensagens.
        </p>
      </div>

      <Callout title="O que acontece em cada etapa?">
        Cliente e servidor trocam chaves públicas efêmeras (ECDH) e cada um combina a sua chave privada com a pública do outro: os dois chegam ao mesmo segredo sem
        transmiti-lo. Uma função de derivação (HKDF) transforma esse segredo na chave de sessão AES. O certificado e a assinatura provam a identidade do servidor, e o
        AES-GCM protege o sigilo e a integridade das mensagens. No TLS 1.3 real há chaves separadas para cada direção e um cronograma de chaves mais elaborado{' '}
        <Cite c="RESCORLA, 2018" />.
      </Callout>
    </div>
  );
}
