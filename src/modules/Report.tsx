import { useState } from 'react';
import { CheckCircle2, Circle, Download, FileText, FileType2, Send, ShieldCheck } from 'lucide-react';
import { buildReport, reportFilename } from '../lib/report';
import logoUrl from '../assets/logos-instituicao.jpg';
import { downloadBytes } from '../lib/download';
import { dataUrlToBytes, reportDocxFilename } from '../lib/reportDocx';
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
  const [busyDocx, setBusyDocx] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');

  const missing = REQUIRED_EVIDENCE.filter((k) => !state.evidence[k].trim());
  const answered = Object.values(state.answers).filter((a) => a.trim()).length;

  const generateDocx = async () => {
    setBusyDocx(true);
    setMsg(null);
    try {
      // Carregado sob demanda para não pesar o restante do site.
      const [{ buildReportDocx }, { Packer }] = await Promise.all([import('../lib/reportDocx'), import('docx')]);
      mark('rel:gerado');
      addLog({ module: 'relatorio', technique: 'Relatório', action: 'Relatório Word (.docx) gerado', ok: true });
      const withDone = { ...state, milestones: { ...state.milestones, 'rel:gerado': 'ok' } };
      const logo = await loadLogo();
      const doc = buildReportDocx(withDone, { logo: logo ? dataUrlToBytes(logo) : undefined });
      const blob = await Packer.toBlob(doc);
      const name = reportDocxFilename(state);
      downloadBytes(new Uint8Array(await blob.arrayBuffer()), name, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      setMsg({ kind: 'success', text: `Relatório “${name}” gerado em Word. Abra, confira, cole os prints nos quadros indicados e entregue no Teams.` });
    } catch (e) {
      setMsg({ kind: 'error', text: `Não foi possível gerar o Word: ${(e as Error).message}` });
    } finally {
      setBusyDocx(false);
    }
  };

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

      <Card title="Como entregar no Microsoft Teams" icon={Send}>
        <ol className="space-y-2 text-sm text-slate-200">
          {[
            'Gere o relatório em Word (.docx) pelo botão abaixo e abra o arquivo.',
            'Confira as respostas e cole os prints nos quadros indicados (no Windows: Windows + Shift + S e depois Ctrl + V).',
            'Salve o arquivo com o nome relatorio-criptolab-SEU-RA.docx.',
            'No Teams, abra a equipe da disciplina e vá em Tarefas.',
            'Abra a tarefa “Laboratório de Criptografia” e clique em “Adicionar trabalho”.',
            'Envie o arquivo .docx (se o professor pedir, envie também o PDF).',
            'Clique em “Entregar” e confira se o status mudou para entregue.',
          ].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-cyan-300">{i + 1}.</span> {t}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-400">
          A atividade é individual: relatórios com RA de outra pessoa ou respostas copiadas serão considerados plágio. Use somente os dados fictícios do laboratório.
        </p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={Download} onClick={generate} loading={busy}>
            Gerar relatório PDF
          </Button>
          <Button variant="secondary" icon={FileType2} onClick={generateDocx} loading={busyDocx}>
            Gerar relatório Word (.docx)
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
