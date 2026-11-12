import { useState } from 'react';
import { CheckCircle2, Circle, Download, FileText, ShieldCheck } from 'lucide-react';
import { buildReport, reportFilename } from '../lib/report';
import logoUrl from '../assets/logos-instituicao.jpg';
import { REQUIRED_EVIDENCE } from '../data/questions';
import { MODULE_LABEL } from '../nav';
import { MODULE_REQUIREMENTS, useLab, type ModuleId } from '../store';
import { Button, Callout, Card, PageHeader, ProgressBar, Status, type StatusMsg } from '../components/ui';

/** Carrega o cabeçalho com os logotipos (arquivo do próprio site) como data URL para o PDF. */
async function loadLogo(): Promise<string | undefined> {
  try {
    if (logoUrl.startsWith('data:')) return logoUrl;
    const blob = await (await fetch(logoUrl)).blob();
    return await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export default function Report() {
  const { state, progress, mark, addLog } = useLab();
  const [msg, setMsg] = useState<StatusMsg>(null);
  const [busy, setBusy] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');

  const missing = REQUIRED_EVIDENCE.filter((k) => !state.evidence[k].trim());
  const answered = Object.values(state.answers).filter((a) => a.trim()).length;

  const generate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await new Promise((r) => setTimeout(r, 30));
      mark('rel:gerado');
      addLog({ module: 'relatorio', technique: 'Relatório', action: 'Relatório PDF gerado', ok: true });
      const withDone = { ...state, milestones: { ...state.milestones, 'rel:gerado': 'ok' } };
      const doc = buildReport(withDone, { logo: await loadLogo() });
      const name = reportFilename(state);
      const blob = doc.output('blob');
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(URL.createObjectURL(blob));
      doc.save(name);
      setMsg({ kind: 'success', text: `Relatório “${name}” gerado (${doc.getNumberOfPages()} páginas). Se o download não iniciar, use o botão “Abrir PDF”.` });
    } catch (e) {
      setMsg({ kind: 'error', text: `Não foi possível gerar o PDF: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} kicker="Módulo 8" title="Relatório final">
        Gere um PDF com sua identificação acadêmica, a data de execução, os módulos realizados, as técnicas utilizadas, os resultados, as evidências, as respostas e a
        conclusão.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Situação dos módulos">
          <ul className="space-y-3">
            {(Object.keys(MODULE_REQUIREMENTS) as ModuleId[])
              .filter((m) => m !== 'relatorio')
              .map((m) => (
                <li key={m}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    {progress[m] >= 1 ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-slate-600" />}
                    <span className="text-slate-200">{MODULE_LABEL[m]}</span>
                  </div>
                  <ProgressBar value={progress[m]} />
                </li>
              ))}
          </ul>
        </Card>
        <Card title="Conteúdo do relatório" icon={ShieldCheck}>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• RA: {state.evidence.ra || state.ra || <span className="text-amber-300">não informado</span>}</li>
            <li>• Operações registradas: {state.log.length}</li>
            <li>• Respostas escritas: {answered}</li>
            <li>• Capturas de tela: {state.attachments.length}</li>
            <li>• Referências bibliográficas (ABNT)</li>
          </ul>
          <div className="mt-4">
            <Callout tone="success" title="Sem segredos no PDF">
              Chaves privadas, chaves AES e frases-senha nunca são registradas. O relatório traz apenas resultados públicos (texto cifrado, hashes, impressões digitais
              parciais) e suas respostas.
            </Callout>
          </div>
        </Card>
      </div>

      {missing.length > 0 && (
        <Callout tone="warn" title="Evidências incompletas">
          Ainda faltam: {missing.join(', ')}. Você pode gerar o relatório mesmo assim, mas o ideal é completar o módulo{' '}
          <a href="#evidencias" className="underline">
            Evidências
          </a>
          .
        </Callout>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={Download} onClick={generate} loading={busy}>
            Gerar relatório PDF
          </Button>
          {blobUrl && (
            <a href={blobUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan-300 hover:underline">
              Abrir PDF
            </a>
          )}
        </div>
        <div className="mt-3">
          <Status msg={msg} />
        </div>
      </Card>
    </div>
  );
}
