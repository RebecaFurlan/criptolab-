import { useEffect } from 'react';
import { ArrowRight, ClipboardCheck, ListOrdered, Trash2 } from 'lucide-react';
import { resolveRa } from '../lib/ra';
import { useLab } from '../store';
import { EVIDENCE_FIELDS, REQUIRED_EVIDENCE } from '../data/questions';
import { MODULE_LABEL } from '../nav';
import { Badge, Button, Callout, Card, Field, PageHeader, TextArea, TextInput } from '../components/ui';
import { EvidenceUploader } from '../components/EvidenceUploader';

export default function Evidence() {
  const { state, setEvidence, mark, reset } = useLab();
  const e = state.evidence;
  const filled = REQUIRED_EVIDENCE.filter((k) => e[k].trim().length > 0).length;
  const complete = filled === REQUIRED_EVIDENCE.length;

  useEffect(() => {
    if (complete) mark('evid:preenchido');
  }, [complete, mark]);

  const autofill = () => {
    const r = state.ra ? resolveRa(state.ra) : null;
    setEvidence({
      ra: e.ra || state.ra,
      desafio: e.desafio || (r && r.ok ? r.range.title : ''),
      tecnica: e.tecnica || (r && r.ok ? r.range.technique : ''),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardCheck} kicker="Módulo 5" title="Evidências da atividade">
        Registre o que você fez, o que obteve e o que aprendeu. Tudo fica salvo apenas nesta aba do navegador e será usado no relatório PDF.
      </PageHeader>

      <Card
        title="Registro da atividade"
        actions={
          <Button size="sm" variant="secondary" onClick={autofill} disabled={!state.ra}>
            Preencher com dados do desafio
          </Button>
        }
        subtitle={
          <span className="flex items-center gap-2">
            Campos obrigatórios preenchidos: {filled}/{REQUIRED_EVIDENCE.length} {complete && <Badge tone="emerald">Completo</Badge>}
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {EVIDENCE_FIELDS.map((f) => (
            <div key={f.id} className={f.long ? 'md:col-span-2' : ''}>
              <Field label={`${f.label}${REQUIRED_EVIDENCE.includes(f.id) ? ' *' : ''}`} htmlFor={`ev-${f.id}`} hint={f.hint}>
                {f.long ? (
                  <TextArea id={`ev-${f.id}`} value={e[f.id]} onChange={(ev) => setEvidence({ [f.id]: ev.target.value })} rows={f.id === 'resultado' ? 4 : 3} />
                ) : (
                  <TextInput id={`ev-${f.id}`} value={e[f.id]} onChange={(ev) => setEvidence({ [f.id]: ev.target.value })} autoComplete="off" />
                )}
              </Field>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Capturas de tela e anexos" subtitle="Anexe imagens que comprovem a execução das operações.">
        <EvidenceUploader context="Evidência geral" />
      </Card>

      <Card title="Registro automático de operações" icon={ListOrdered} subtitle="Cada operação executada no laboratório é registrada aqui. Chaves secretas e privadas nunca são registradas.">
        {state.log.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma operação registrada ainda.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Hora</th>
                  <th className="px-3 py-2">Módulo</th>
                  <th className="px-3 py-2">Técnica</th>
                  <th className="px-3 py-2">Operação</th>
                  <th className="px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[...state.log].reverse().map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-1.5 font-mono text-slate-500">{new Date(l.time).toLocaleTimeString('pt-BR')}</td>
                    <td className="px-3 py-1.5 text-slate-400">{MODULE_LABEL[l.module]}</td>
                    <td className="px-3 py-1.5 text-slate-200">{l.technique}</td>
                    <td className="px-3 py-1.5 text-slate-300">
                      {l.action}
                      {l.output && <span className="block truncate font-mono text-[10px] text-cyan-300/70">{l.output}</span>}
                    </td>
                    <td className="px-3 py-1.5">{l.ok ? <Badge tone="emerald">ok</Badge> : <Badge tone="amber">falhou</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="danger"
          icon={Trash2}
          onClick={() => {
            if (window.confirm('Apagar todas as respostas, evidências e o progresso desta sessão? Esta ação não pode ser desfeita.')) reset();
          }}
        >
          Limpar dados da sessão
        </Button>
        <a href="#relatorio" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300">
          Ir para o relatório <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      {!complete && <Callout tone="info">Preencha os campos marcados com * para concluir este módulo.</Callout>}
    </div>
  );
}
