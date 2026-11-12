// Desafio 00–19: Proteção de arquivos com AES-256-GCM.
import { useRef, useState } from 'react';
import { Download, FilePlus2, FileLock2, FileUp, KeyRound, Lock, LockOpen } from 'lucide-react';
import { aesDecrypt, aesEncrypt, generateAesKey, keyFingerprint, packEncryptedFile, sha256Hex, unpackEncryptedFile } from '../../lib/crypto';
import { downloadBytes, readFileBytes } from '../../lib/download';
import { formatBytes, toHex, utf8 } from '../../lib/encoding';
import { useLab } from '../../store';
import { Button, Callout, Flow, Output, RealSeal, Status, useAction } from '../../components/ui';
import type { ChallengeResult } from './types';

const MAX = 10 * 1024 * 1024;

export function FileChallenge({ onResult }: { onResult: (r: ChallengeResult) => void }) {
  const { addLog, mark } = useLab();
  const { busy, msg, run } = useAction();
  const pick = useRef<HTMLInputElement>(null);
  const pickEnc = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array<ArrayBuffer>; hash: string } | null>(null);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [fp, setFp] = useState('');
  const [enc, setEnc] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [restored, setRestored] = useState<{ bytes: Uint8Array<ArrayBuffer>; hash: string } | null>(null);

  const loadBytes = async (name: string, bytes: Uint8Array<ArrayBuffer>) => {
    setFile({ name, bytes, hash: await sha256Hex(bytes) });
    setEnc(null);
    setRestored(null);
  };

  const sample = () =>
    run('sample', async () => {
      const text = `RELATÓRIO INTERNO — ARQUIVO DE TESTE (FICTÍCIO)\nGerado pelo CriptoLab em ${new Date().toLocaleString('pt-BR')}\n\nProjeto: Laboratório de Criptografia\nConteúdo confidencial de exemplo: a reunião de planejamento será na sala 12.\n`;
      await loadBytes('arquivo-teste.txt', utf8(text));
      return 'Arquivo de teste criado na memória do navegador.';
    });

  const choose = (f: File | undefined) =>
    run('pick', async () => {
      if (!f) return;
      if (f.size > MAX) throw new Error(`O arquivo tem ${formatBytes(f.size)}; use um arquivo de até 10 MB.`);
      await loadBytes(f.name, await readFileBytes(f));
      return `Arquivo “${f.name}” carregado (${formatBytes(f.size)}). Ele não sai do seu navegador.`;
    });

  const genKey = () =>
    run('key', async () => {
      const k = await generateAesKey(true);
      setKey(k);
      setFp(await keyFingerprint(k));
      setEnc(null);
      setRestored(null);
      addLog({ module: 'desafio', technique: 'AES-256-GCM', action: 'Chave de arquivo gerada (não registrada)', ok: true });
      return 'Chave AES-256 gerada. Guarde-a em mente: sem ela, o arquivo cifrado não poderá ser recuperado.';
    });

  const encrypt = () =>
    run('enc', async () => {
      if (!file) throw new Error('Escolha um arquivo ou gere o arquivo de teste.');
      if (!key) throw new Error('Gere a chave AES primeiro.');
      const packed = packEncryptedFile(await aesEncrypt(key, file.bytes));
      setEnc(packed);
      setRestored(null);
      addLog({ module: 'desafio', technique: 'AES-256-GCM', action: `Arquivo cifrado (${file.name})`, input: `SHA-256 original: ${file.hash}`, output: `${packed.length} bytes`, ok: true });
      return `Arquivo cifrado: ${formatBytes(packed.length)} (inclui cabeçalho, IV de 12 bytes e etiqueta de 16 bytes).`;
    });

  const decrypt = (bytes?: Uint8Array<ArrayBuffer>) =>
    run('dec', async () => {
      const src = bytes ?? enc;
      if (!src) throw new Error('Cifre um arquivo ou carregue um arquivo .clab.');
      if (!key) throw new Error('A chave não está mais disponível nesta página. Sem a chave, não há como recuperar o arquivo.');
      const { iv, ciphertext } = unpackEncryptedFile(src);
      const plain = await aesDecrypt(key, iv, ciphertext);
      const hash = await sha256Hex(plain);
      setRestored({ bytes: plain, hash });
      const same = file ? hash === file.hash : false;
      addLog({ module: 'desafio', technique: 'AES-256-GCM', action: 'Arquivo descriptografado', output: `SHA-256 recuperado: ${hash}${same ? ' (igual ao original)' : ''}`, ok: true });
      mark('desafio:execucao');
      onResult({
        mensagem: file ? `Arquivo de teste “${file.name}” (${formatBytes(file.bytes.length)})` : 'Arquivo .clab',
        resultado: `Arquivo cifrado com AES-256-GCM (${src.length} bytes) e recuperado. SHA-256 do original e do recuperado ${same ? 'idênticos' : 'diferentes'}: ${hash}`,
      });
      return same ? 'Arquivo recuperado! O hash SHA-256 é idêntico ao do original: nenhum byte foi perdido ou alterado.' : 'Arquivo recuperado.';
    });

  const name = file?.name ?? 'arquivo';

  return (
    <div className="space-y-4">
      <RealSeal />
      <Callout tone="warn">Use o arquivo de teste ou um arquivo sem informações pessoais. O processamento acontece somente no seu navegador.</Callout>
      <input ref={pick} type="file" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      <input
        ref={pickEnc}
        type="file"
        accept=".clab"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await decrypt(await readFileBytes(f));
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={FilePlus2} onClick={sample} loading={busy === 'sample'}>
          Gerar arquivo de teste
        </Button>
        <Button variant="secondary" icon={FileUp} onClick={() => pick.current?.click()} loading={busy === 'pick'}>
          Escolher arquivo
        </Button>
        <Button variant="secondary" icon={KeyRound} onClick={genKey} loading={busy === 'key'}>
          {key ? 'Nova chave' : 'Gerar chave AES'}
        </Button>
      </div>
      {file && <Output label={`Original: ${file.name} · ${formatBytes(file.bytes.length)} · SHA-256`} value={file.hash} />}
      {key && (
        <p className="text-sm text-amber-200">
          <KeyRound className="mr-1 inline h-4 w-4" /> Chave ativa · impressão digital <code>{fp}</code>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button icon={Lock} onClick={encrypt} loading={busy === 'enc'} disabled={!file || !key}>
          Criptografar arquivo
        </Button>
        {enc && (
          <Button variant="secondary" icon={Download} onClick={() => downloadBytes(enc, `${name}.clab`)}>
            Baixar {name}.clab
          </Button>
        )}
        <Button variant="success" icon={LockOpen} onClick={() => decrypt()} loading={busy === 'dec'} disabled={!enc}>
          Descriptografar
        </Button>
        <Button variant="ghost" icon={FileLock2} onClick={() => pickEnc.current?.click()} disabled={!key}>
          Abrir um .clab
        </Button>
      </div>
      <Status msg={msg} />
      {enc && <Output label="Primeiros 64 bytes do arquivo cifrado (hex)" value={toHex(enc.slice(0, 64))} tone="cyan" />}
      {restored && (
        <div className="space-y-2">
          <Output label="SHA-256 do arquivo recuperado" value={restored.hash} tone={restored.hash === file?.hash ? 'emerald' : 'rose'} />
          <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadBytes(restored.bytes, `recuperado-${name}`)}>
            Baixar arquivo recuperado
          </Button>
        </div>
      )}
      <Flow
        compact
        steps={[
          { label: 'Arquivo original', tone: 'slate' },
          { label: 'AES-256-GCM + chave + IV', tone: 'amber', icon: KeyRound },
          { label: 'Arquivo .clab ilegível', tone: 'cyan', icon: Lock },
          { label: 'Mesma chave → arquivo original', tone: 'emerald', icon: LockOpen },
        ]}
      />
    </div>
  );
}
