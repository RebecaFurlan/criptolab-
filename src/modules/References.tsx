import { Library } from 'lucide-react';
import { ACCESS_DATE, REFERENCES } from '../data/references';
import { Callout, Card, PageHeader } from '../components/ui';

export default function References() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Library} kicker="Fontes" title="Referências">
        Referências organizadas conforme a ABNT NBR 6023:2018, em ordem alfabética. No texto do laboratório, as fontes aparecem no sistema autor-data, como (NIST, 2001).
      </PageHeader>
      <Card>
        <ol className="space-y-4 text-sm leading-relaxed text-slate-200">
          {REFERENCES.map((r) => (
            <li key={r.id} id={`ref-${r.id}`}>
              {r.before}
              <strong className="text-white">{r.bold}</strong>
              {r.after} Disponível em:{' '}
              <a href={r.url} target="_blank" rel="noreferrer noopener" className="break-all text-cyan-300 underline decoration-cyan-300/30 hover:text-cyan-200">
                {r.url}
              </a>
              . Acesso em: {ACCESS_DATE}.
              <span className="mt-1 block text-xs text-slate-500">Chamada no texto: ({r.cite})</span>
            </li>
          ))}
        </ol>
      </Card>
      <Callout tone="info" title="Observação sobre as datas">
        A data de publicação do artigo da Valid Certificadora não pôde ser confirmada; por isso foi indicada como [20--?] (século provável), conforme a NBR 6023:2018, em vez de
        uma data inventada. Para a FIPS 197 foi mantida a indicação “Atualização editorial: 2023” fornecida no material de origem.
      </Callout>
    </div>
  );
}
