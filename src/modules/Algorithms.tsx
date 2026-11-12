import { useEffect, useState } from 'react';
import { ArrowRight, Cpu, FlaskConical, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX } from 'lucide-react';
import { ALGORITHMS, STATUS_LABEL, type Algorithm, type AlgoStatus } from '../data/algorithms';
import { useLab } from '../store';
import { Badge, Callout, Card, Cite, KeyValue, PageHeader, cx } from '../components/ui';
import { EdeDemo, FeistelDemo, IdeaDemo, SaferDemo, WhiteningDemo } from '../components/ConceptDemos';

const statusTone: Record<AlgoStatus, 'emerald' | 'cyan' | 'amber' | 'rose'> = {
  recomendado: 'emerald',
  'seguro-pouco-usado': 'cyan',
  legado: 'amber',
  obsoleto: 'rose',
};
const statusIcon: Record<AlgoStatus, typeof ShieldCheck> = {
  recomendado: ShieldCheck,
  'seguro-pouco-usado': ShieldQuestion,
  legado: ShieldAlert,
  obsoleto: ShieldX,
};

function Demo({ a }: { a: Algorithm }) {
  switch (a.demo) {
    case 'aes':
    case 'rsa':
      return (
        <div className="space-y-3">
          <Callout tone="success" title="Implementação real disponível">
            O navegador oferece {a.name} pela Web Crypto API. Execute-o de verdade no módulo de Simulações.
          </Callout>
          <a
            href="#simulacoes"
            onClick={() => sessionStorage.setItem('criptolab:simTab', a.demo === 'aes' ? 'aes' : 'rsa')}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300"
          >
            Abrir simulação de {a.demo === 'aes' ? 'AES-256-GCM' : 'RSA-OAEP'} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      );
    case 'feistel':
      return <FeistelDemo key={a.id} algo={a.name} />;
    case 'ede':
      return <EdeDemo />;
    case 'whitening':
      return <WhiteningDemo />;
    case 'idea':
      return <IdeaDemo />;
    case 'safer':
      return <SaferDemo />;
  }
}

export default function Algorithms() {
  const { state, mark, addLog } = useLab();
  const [sel, setSel] = useState('aes');
  const a = ALGORITHMS.find((x) => x.id === sel)!;
  const viewed = Object.keys(state.milestones).filter((k) => k.startsWith('alg:view:')).length;

  useEffect(() => {
    if (!state.milestones[`alg:view:${sel}`]) {
      mark(`alg:view:${sel}`);
      addLog({ module: 'algoritmos', technique: ALGORITHMS.find((x) => x.id === sel)!.name, action: 'Ficha do algoritmo consultada', ok: true });
    }
  }, [sel, state.milestones, mark, addLog]);

  useEffect(() => {
    if (viewed >= 3) mark('alg:visto3');
  }, [viewed, mark]);

  const SIcon = statusIcon[a.status];

  return (
    <div className="space-y-6">
      <PageHeader icon={Cpu} kicker="Módulo 2" title="Laboratório de algoritmos">
        Conheça dez algoritmos citados com frequência em materiais sobre criptografia <Cite c="VALID CERTIFICADORA, [20--?]" />. AES e RSA rodam de verdade neste
        laboratório; os demais aparecem em <strong>demonstrações conceituais</strong>, claramente identificadas, porque o navegador não os implementa.
      </PageHeader>

      <Callout tone="danger" title="Atenção: algoritmos antigos">
        DES e 3DES (assim como DESX) <strong>não devem ser escolhidos para proteger novos sistemas</strong>. Eles aparecem aqui pelo valor histórico e didático. Para novos
        projetos, prefira AES (simétrico) e RSA com chaves de 2048 bits ou mais, ou curvas elípticas (assimétrico) <Cite c="NIST, 2020" />.
      </Callout>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-5" role="tablist" aria-label="Algoritmos">
        {ALGORITHMS.map((x, i) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={sel === x.id}
            onClick={() => setSel(x.id)}
            className={cx(
              'rounded-xl border px-3 py-2.5 text-left transition',
              sel === x.id ? 'border-cyan-400/60 bg-cyan-400/15' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600',
            )}
          >
            <span className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-500">{String(i + 1).padStart(2, '0')}</span>
              <span className={cx('h-2 w-2 rounded-full', { emerald: 'bg-emerald-400', cyan: 'bg-cyan-400', amber: 'bg-amber-400', rose: 'bg-rose-400' }[statusTone[x.status]])} />
            </span>
            <span className="block font-bold text-white">{x.name}</span>
            <span className="block text-[11px] text-slate-400">{x.support === 'webcrypto' ? 'Execução real' : 'Conceitual'}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">Fichas consultadas: {Math.min(viewed, 10)}/10 (consulte pelo menos 3 e execute uma demonstração para concluir o módulo).</p>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title={`${a.name} — ${a.fullName}`} subtitle={`${a.year} · ${a.authors}`}>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone={a.category.startsWith('Simétrica') ? 'cyan' : 'violet'}>{a.category}</Badge>
            <Badge tone={statusTone[a.status]}>
              <SIcon className="h-3 w-3" /> {STATUS_LABEL[a.status]}
            </Badge>
            {a.support === 'webcrypto' ? <Badge tone="emerald">Web Crypto API</Badge> : <Badge tone="violet">Somente demonstração conceitual</Badge>}
          </div>
          <KeyValue
            items={[
              ['Nome', `${a.name} (${a.fullName})`],
              ['Categoria', a.category],
              [
                'Funcionamento',
                <>
                  {a.working} {a.cite && <Cite c={a.cite} />}
                </>,
              ],
              ['Tipo de chave', a.keyType],
              ['Bloco', a.block],
              ['Finalidade', a.purpose],
              [
                'Aplicações',
                <ul className="list-inside list-disc">
                  {a.applications.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>,
              ],
              ['Situação atual', a.statusText],
            ]}
          />
        </Card>
        <Card className="lg:col-span-2" title="Exemplo didático" icon={FlaskConical} subtitle={a.example}>
          <Demo a={a} />
        </Card>
      </div>

      <Card title="Comparativo rápido">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 pr-3">Algoritmo</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Chave</th>
                <th className="py-2 pr-3">Bloco</th>
                <th className="py-2 pr-3">Situação</th>
                <th className="py-2">Neste laboratório</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ALGORITHMS.map((x) => (
                <tr key={x.id} className={cx('cursor-pointer hover:bg-slate-800/40', sel === x.id && 'bg-cyan-400/5')} onClick={() => setSel(x.id)}>
                  <td className="py-2 pr-3 font-semibold text-white">{x.name}</td>
                  <td className="py-2 pr-3 text-slate-300">{x.category.startsWith('Simétrica') ? 'Simétrica' : 'Assimétrica'}</td>
                  <td className="py-2 pr-3 text-slate-300">{x.keyType.replace(/^Chave secreta (única )?(de )?/, '').replace(/^Par de chaves: /, 'Par · ')}</td>
                  <td className="py-2 pr-3 text-slate-300">{x.block.split(' (')[0]}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={statusTone[x.status]}>{STATUS_LABEL[x.status].split(' —')[0]}</Badge>
                  </td>
                  <td className="py-2 text-slate-300">{x.support === 'webcrypto' ? 'Execução real' : 'Demonstração conceitual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
