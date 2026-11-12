import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, LockOpen, ShieldAlert, Shuffle } from 'lucide-react';
import { aesDecrypt, aesEncrypt, exportRawKey, generateAesKey, keyFingerprint } from '../../lib/crypto';
import { fromUtf8, groupHex, toBase64, toHex } from '../../lib/encoding';
import { useLab, type ModuleId } from '../../store';
import { Button, Callout, Cite, Field, Flow, Output, RealSeal, Status, TextArea, useAction } from '../ui';

export interface AesOutcome {
  plaintext: string;
  ciphertextB64: string;
  ivHex: string;
  decrypted?: string;
}

export function AesTool({
  module,
  initialText = 'Mensagem secreta do laboratório',
  onEncrypted,
  onDecrypted,
  milestone,
  showExplanation = true,
  readOnlyText = false,
  label = 'Texto claro (mensagem original)',
}: {
  module: ModuleId;
  initialText?: string;
  onEncrypted?: (o: AesOutcome) => void;
  onDecrypted?: (o: AesOutcome) => void;
  milestone?: string;
  showExplanation?: boolean;
  readOnlyText?: boolean;
  label?: string;
}) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const [text, setText] = useState(initialText);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [keyHex, setKeyHex] = useState('');
  const [fp, setFp] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [iv, setIv] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [ct, setCt] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [plain, setPlain] = useState('');
  const [tampered, setTampered] = useState(false);

  const effectiveText = readOnlyText ? initialText : text;

  const genKey = () =>
    run('key', async () => {
      const k = await generateAesKey(true);
      setKey(k);
      setKeyHex(toHex(await exportRawKey(k)));
      setFp(await keyFingerprint(k));
      setCt(null);
      setIv(null);
      setPlain('');
      setTampered(false);
      addLog({ module, technique: 'AES-256-GCM', action: 'Chave AES de 256 bits gerada (valor não registrado)', ok: true });
      return 'Chave AES-256 gerada com um gerador de números aleatórios criptograficamente seguro.';
    });

  const encrypt = () =>
    run('enc', async () => {
      if (!effectiveText) throw new Error('Digite um texto para criptografar.');
      let k = key;
      if (!k) {
        k = await generateAesKey(true);
        setKey(k);
        setKeyHex(toHex(await exportRawKey(k)));
        setFp(await keyFingerprint(k));
      }
      const r = await aesEncrypt(k, effectiveText);
      setIv(r.iv);
      setCt(r.ciphertext);
      setPlain('');
      setTampered(false);
      const out = { plaintext: effectiveText, ciphertextB64: toBase64(r.ciphertext), ivHex: toHex(r.iv) };
      addLog({ module, technique: 'AES-256-GCM', action: 'Criptografia', input: effectiveText, output: out.ciphertextB64, ok: true });
      onEncrypted?.(out);
      return `Texto criptografado: ${r.ciphertext.length} bytes (${r.ciphertext.length - 16} de dados + 16 da etiqueta de autenticação).`;
    });

  const decrypt = (withKey?: CryptoKey, wrong = false) =>
    run(wrong ? 'wrong' : 'dec', async () => {
      if (!ct || !iv || !key) throw new Error('Criptografe uma mensagem primeiro.');
      try {
        const pt = fromUtf8(await aesDecrypt(withKey ?? key, iv, ct));
        setPlain(pt);
        const out = { plaintext: effectiveText, ciphertextB64: toBase64(ct), ivHex: toHex(iv), decrypted: pt };
        addLog({ module, technique: 'AES-256-GCM', action: 'Descriptografia', input: toBase64(ct), output: pt, ok: true });
        onDecrypted?.(out);
        if (milestone) mark(milestone);
        return pt === effectiveText ? 'Descriptografia concluída: o resultado é idêntico ao texto original.' : 'Descriptografia concluída.';
      } catch (e) {
        setPlain('');
        addLog({
          module,
          technique: 'AES-256-GCM',
          action: wrong ? 'Descriptografia com chave errada (falhou, como esperado)' : tampered ? 'Descriptografia de dado adulterado (falhou, como esperado)' : 'Descriptografia falhou',
          ok: false,
        });
        const m = e instanceof Error ? e.message : String(e);
        throw new Error(wrong || tampered ? `Resultado esperado — ${m}` : m);
      }
    });

  const tamper = () => {
    if (!ct) return;
    const copy = ct.slice();
    const pos = Math.floor(copy.length / 3);
    copy[pos] ^= 0x01;
    setCt(copy);
    setTampered(true);
    setPlain('');
    addLog({ module, technique: 'AES-256-GCM', action: 'Um bit do texto cifrado foi alterado (simulação de adulteração)', ok: true });
  };

  const wrongKey = async () => {
    const other = await generateAesKey(false);
    await decrypt(other, true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <RealSeal />
      </div>

      <Field label={label} htmlFor={`aes-${module}`} hint={readOnlyText ? 'Dado fictício fornecido pelo laboratório.' : undefined}>
        <TextArea id={`aes-${module}`} value={effectiveText} readOnly={readOnlyText} onChange={(e) => setText(e.target.value)} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={KeyRound} onClick={genKey} loading={busy === 'key'}>
          {key ? 'Gerar nova chave' : 'Gerar chave'}
        </Button>
        <Button icon={Lock} onClick={encrypt} loading={busy === 'enc'}>
          Criptografar
        </Button>
        <Button variant="success" icon={LockOpen} onClick={() => decrypt()} loading={busy === 'dec'} disabled={!ct}>
          Descriptografar
        </Button>
      </div>

      <Status msg={msg} />

      {key && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-amber-100">
              <KeyRound className="mr-1 inline h-4 w-4" aria-hidden /> Chave secreta (256 bits) · impressão digital <code className="font-mono text-amber-200">{fp}</code>
            </p>
            <Button size="sm" variant="ghost" icon={showKey ? EyeOff : Eye} onClick={() => setShowKey((v) => !v)}>
              {showKey ? 'Ocultar chave' : 'Mostrar chave'}
            </Button>
          </div>
          {showKey && <p className="mt-2 break-all font-mono text-xs text-amber-200">{groupHex(keyHex, 8)}</p>}
          <p className="mt-1 text-xs text-amber-200/70">A chave fica apenas na memória desta página e não é incluída no relatório.</p>
        </div>
      )}

      {ct && iv && (
        <div className="grid gap-3 md:grid-cols-2">
          <Output label="IV / nonce (96 bits, hexadecimal)" value={groupHex(toHex(iv))} tone="cyan" />
          <Output label={`Texto cifrado (Base64)${tampered ? ' — ADULTERADO' : ''}`} value={toBase64(ct)} tone={tampered ? 'rose' : 'cyan'} />
        </div>
      )}

      {plain && <Output label="Texto recuperado após descriptografia" value={plain} tone="emerald" mono={false} />}

      {ct && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="danger" icon={ShieldAlert} onClick={tamper}>
            Adulterar 1 bit do texto cifrado
          </Button>
          <Button size="sm" variant="secondary" icon={Shuffle} onClick={wrongKey} loading={busy === 'wrong'}>
            Tentar descriptografar com outra chave
          </Button>
        </div>
      )}

      {showExplanation && (
        <div className="space-y-3">
          <Flow
            compact
            steps={[
              { label: 'Texto claro', sub: effectiveText.slice(0, 24) || '…', tone: 'slate' },
              { label: 'AES-256-GCM + chave + IV', sub: fp || 'gere a chave', tone: 'amber', icon: KeyRound },
              { label: 'Texto cifrado + etiqueta', sub: ct ? toBase64(ct).slice(0, 22) + '…' : '…', tone: 'cyan', icon: Lock },
            ]}
          />
          <Callout title="O que são a chave e o IV?">
            A <strong>chave</strong> é o segredo de 256 bits que deve ser conhecido apenas por quem pode ler os dados; a mesma chave cifra e decifra (criptografia
            simétrica). O <strong>IV</strong> (vetor de inicialização, ou <em>nonce</em>) tem 96 bits, é gerado aleatoriamente a cada operação e{' '}
            <strong>não é secreto</strong>, mas nunca deve se repetir com a mesma chave. Por isso, cifrar a mesma mensagem duas vezes gera resultados diferentes. O modo
            GCM acrescenta uma <strong>etiqueta de autenticação</strong> de 128 bits: se um único bit for alterado, a descriptografia é recusada. O AES trabalha com
            blocos de 128 bits e chaves de 128, 192 ou 256 bits <Cite c="NIST, 2001" />.
          </Callout>
        </div>
      )}
    </div>
  );
}
