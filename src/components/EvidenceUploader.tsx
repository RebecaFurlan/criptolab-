import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { formatBytes } from '../lib/encoding';
import { useLab } from '../store';
import { Button, Status, TextInput, type StatusMsg } from './ui';

const MAX = 3 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Lê uma imagem, reduz para no máximo 1400 px e devolve JPEG/PNG em data URL (fica só no navegador). */
async function toDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Não foi possível ler a imagem.'));
      i.src = url;
    });
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function EvidenceUploader({ context }: { context: string }) {
  const { state, addAttachment, removeAttachment, updateAttachment, addLog } = useLab();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<StatusMsg>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!TYPES.includes(f.type)) {
        setMsg({ kind: 'error', text: `“${f.name}”: envie uma imagem PNG, JPG ou WEBP.` });
        continue;
      }
      if (f.size > MAX) {
        setMsg({ kind: 'error', text: `“${f.name}” tem ${formatBytes(f.size)}; o limite é 3 MB.` });
        continue;
      }
      try {
        const dataUrl = await toDataUrl(f);
        addAttachment({ name: f.name, type: 'image/jpeg', size: f.size, dataUrl, caption: context });
        addLog({ module: 'evidencias', technique: 'Evidência', action: `Captura de tela anexada (${context})`, ok: true });
        setMsg({ kind: 'success', text: `Evidência “${f.name}” anexada. Ela fica apenas neste navegador e entra no relatório PDF.` });
      } catch (e) {
        setMsg({ kind: 'error', text: (e as Error).message });
      }
    }
    if (input.current) input.current.value = '';
  };

  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept={TYPES.join(',')} multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <Button variant="secondary" icon={ImagePlus} onClick={() => input.current?.click()}>
        Anexar captura de tela
      </Button>
      <p className="text-xs text-slate-400">Capture a tela com o resultado da operação. Não inclua dados pessoais reais na imagem.</p>
      <Status msg={msg} />
      {state.attachments.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.attachments.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
              <img src={a.dataUrl} alt={a.caption || a.name} className="h-32 w-full object-cover" />
              <div className="space-y-2 p-2">
                <TextInput aria-label="Legenda da evidência" value={a.caption} onChange={(e) => updateAttachment(a.id, { caption: e.target.value })} className="py-1.5 text-xs" />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{a.name}</span>
                  <button className="rounded p-1 text-rose-300 hover:bg-rose-500/10" onClick={() => removeAttachment(a.id)} aria-label={`Remover ${a.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
