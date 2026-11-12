import { useState } from 'react';
import { Eye, EyeOff, KeyRound, KeySquare, Lock, LockOpen, Shuffle } from 'lucide-react';
import { exportPrivatePem, exportPublicPem, generateRsaKeyPair, rsaDecrypt, rsaEncrypt, rsaOaepMaxBytes } from '../../lib/crypto';
import { fromUtf8, toBase64, utf8 } from '../../lib/encoding';
import { useLab, type ModuleId } from '../../store';
import { Button, Callout, Cite, Field, Flow, Output, RealSeal, Status, TextArea, cx, useAction } from '../ui';

export function RsaTool({
  module,
  milestone,
  initialText = 'Senha do Wi-Fi do lab: CriptoLab2026',
  onDone,
}: {
  module: ModuleId;
  milestone?: string;
  initialText?: string;
  onDone?: (o: { plaintext: string; ciphertextB64: string; decrypted: string }) => void;
}) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const [pair, setPair] = useState<CryptoKeyPair | null>(null);
  const [pubPem, setPubPem] = useState('');
  const [privPem, setPrivPem] = useState('');
  const [showPriv, setShowPriv] = useState(false);
  const [text, setText] = useState(initialText);
  const [ct, setCt] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [plain, setPlain] = useState('');

  const max = rsaOaepMaxBytes();
  const bytes = utf8(text).length;
  const tooBig = bytes > max;

  const gen = () =>
    run('gen', async () => {
      const t0 = performance.now();
      const kp = await generateRsaKeyPair();
      setPair(kp);
      setPubPem(await exportPublicPem(kp.publicKey));
      setPrivPem(await exportPrivatePem(kp.privateKey));
      setCt(null);
      setPlain('');
      setShowPriv(false);
      addLog({ module, technique: 'RSA-OAEP', action: 'Par de chaves RSA-2048 gerado (chave privada não registrada)', ok: true });
      return `Par de chaves RSA de 2048 bits gerado em ${Math.round(performance.now() - t0)} ms.`;
    });

  const encrypt = () =>
    run('enc', async () => {
      if (!pair) throw new Error('Gere o par de chaves primeiro.');
      if (!text) throw new Error('Digite uma mensagem curta.');
      const c = await rsaEncrypt(pair.publicKey, text);
      setCt(c);
      setPlain('');
      addLog({ module, technique: 'RSA-OAEP', action: 'Criptografia com a chave pública', input: text, output: toBase64(c), ok: true });
      return `Mensagem cifrada com a CHAVE PÚBLICA. O resultado sempre tem ${c.length} bytes (tamanho da chave).`;
    });

  const decrypt = () =>
    run('dec', async () => {
      if (!pair || !ct) throw new Error('Criptografe uma mensagem primeiro.');
      const pt = fromUtf8(await rsaDecrypt(pair.privateKey, ct));
      setPlain(pt);
      addLog({ module, technique: 'RSA-OAEP', action: 'Descriptografia com a chave privada', input: toBase64(ct), output: pt, ok: true });
      if (milestone) mark(milestone);
      onDone?.({ plaintext: text, ciphertextB64: toBase64(ct), decrypted: pt });
      return 'Mensagem recuperada com a CHAVE PRIVADA correspondente.';
    });

  const wrong = () =>
    run('wrong', async () => {
      if (!ct) throw new Error('Criptografe uma mensagem primeiro.');
      const other = await generateRsaKeyPair();
      try {
        await rsaDecrypt(other.privateKey, ct);
        return 'Inesperado: a descriptografia funcionou.';
      } catch (e) {
        addLog({ module, technique: 'RSA-OAEP', action: 'Tentativa com outra chave privada (falhou, como esperado)', ok: false });
        throw new Error(`Resultado esperado — ${(e as Error).message}`);
      }
    });

  return (
    <div className="space-y-4">
      <RealSeal />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={KeySquare} onClick={gen} loading={busy === 'gen'}>
          {pair ? 'Gerar novo par de chaves' : 'Gerar par de chaves (RSA-2048)'}
        </Button>
      </div>

      {pair && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <KeyRound className="h-4 w-4" /> Chave PÚBLICA — pode ser divulgada
            </p>
            <Output label="Formato PEM (SPKI)" value={pubPem} tone="emerald" maxH="max-h-36" />
            <p className="mt-2 text-xs text-emerald-100/70">Usada por qualquer pessoa para CIFRAR mensagens para você. Expoente público: 65537.</p>
          </div>
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                <KeyRound className="h-4 w-4" /> Chave PRIVADA — secreta
              </p>
              <Button size="sm" variant="ghost" icon={showPriv ? EyeOff : Eye} onClick={() => setShowPriv((v) => !v)}>
                {showPriv ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            {showPriv ? (
              <Output label="Formato PEM (PKCS#8)" value={privPem} tone="rose" maxH="max-h-36" />
            ) : (
              <div className="grid h-24 place-items-center rounded-xl border border-dashed border-rose-400/30 text-sm text-rose-200/70">•••• oculta ••••</div>
            )}
            <p className="mt-2 text-xs text-rose-100/70">Somente o dono a possui; é usada para DECIFRAR. Nunca é registrada no relatório.</p>
          </div>
        </div>
      )}

      <Field
        label="Mensagem curta"
        htmlFor={`rsa-${module}`}
        hint={
          <span className={cx(tooBig && 'font-semibold text-rose-300')}>
            {bytes} / {max} bytes — limite do RSA-OAEP com chave de 2048 bits e SHA-256 (k − 2·hLen − 2) <Cite c="MORIARTY et al., 2016" />
          </span>
        }
      >
        <TextArea id={`rsa-${module}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button icon={Lock} onClick={encrypt} loading={busy === 'enc'} disabled={!pair || tooBig}>
          Criptografar com a chave pública
        </Button>
        <Button variant="success" icon={LockOpen} onClick={decrypt} loading={busy === 'dec'} disabled={!ct}>
          Descriptografar com a chave privada
        </Button>
        {ct && (
          <Button size="sm" variant="secondary" icon={Shuffle} onClick={wrong} loading={busy === 'wrong'}>
            Tentar com outra chave privada
          </Button>
        )}
      </div>
      {tooBig && (
        <Callout tone="warn" title="Mensagem acima do limite">
          O RSA não foi feito para cifrar grandes volumes de dados. Para isso, usa-se criptografia híbrida: o AES cifra os dados e o RSA protege apenas a chave AES
          (veja a Etapa 5 do módulo Proteção de Dados).
        </Callout>
      )}

      <Status msg={msg} />

      {ct && <Output label="Texto cifrado (Base64, 256 bytes)" value={toBase64(ct)} tone="cyan" />}
      {plain && <Output label="Mensagem recuperada" value={plain} tone="emerald" mono={false} />}

      <Flow
        compact
        steps={[
          { label: 'Mensagem', tone: 'slate' },
          { label: 'Chave PÚBLICA cifra', tone: 'emerald', icon: Lock },
          { label: 'Texto cifrado', tone: 'cyan' },
          { label: 'Chave PRIVADA decifra', tone: 'rose', icon: LockOpen },
        ]}
      />
      <Callout title="Por que as chaves são diferentes?">
        No RSA, as duas chaves são geradas juntas a partir de dois números primos grandes e secretos. A chave pública contém o módulo <em>n</em> (produto dos primos) e o
        expoente <em>e</em>; a privada contém o expoente <em>d</em>, que só pode ser calculado conhecendo os primos. Descobrir <em>d</em> a partir da chave pública
        exigiria fatorar <em>n</em>, o que é inviável para chaves de 2048 bits. Assim, a chave pública pode ser distribuída livremente sem revelar a privada. O padrão
        OAEP adiciona aleatoriedade: cifrar a mesma mensagem duas vezes gera resultados diferentes <Cite c="MORIARTY et al., 2016" />.
      </Callout>
    </div>
  );
}
