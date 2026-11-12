import { ArrowRight, CheckCircle2, Circle, CircleDot, Lock, ShieldCheck, WifiOff } from 'lucide-react';
import { NAV } from '../nav';
import { useLab } from '../store';
import { Badge, Card, ProgressBar, cx } from '../components/ui';

const DESCRIPTIONS: Record<string, string> = {
  introducao: 'Conceitos essenciais com exemplos visuais: texto claro, cifrado, chave, hash e a tríade CIA.',
  algoritmos: 'Fichas de 10 algoritmos (DES, AES, RSA…) com situação atual e exemplos didáticos.',
  simulacoes: 'Execute Cifra de César, AES-256-GCM, RSA-OAEP e SHA-256 de verdade no navegador.',
  desafios: 'Informe seu RA e receba um desafio prático individual.',
  protecao: 'Atue como equipe de segurança: proteja um cadastro fictício e reflita sobre a LGPD.',
  evidencias: 'Registre resultados, explicações, dificuldades e capturas de tela.',
  relatorio: 'Gere o relatório final em PDF (sem chaves privadas ou segredos).',
};

export default function Home() {
  const { progress, overall } = useLab();
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 p-6 sm:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">Segurança da Informação</Badge>
            <Badge tone="emerald">
              <WifiOff className="h-3 w-3" /> 100% no navegador
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Laboratório Interativo
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">de Criptografia</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Um laboratório virtual para <strong className="text-white">executar, testar, comparar e compreender</strong> técnicas de criptografia. Você vai cifrar e decifrar
            mensagens, gerar hashes e chaves, proteger dados pessoais fictícios e registrar evidências da sua atividade.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#introducao" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300">
              Começar pela Introdução <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#desafios"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              Ver meu desafio por RA
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Objetivo" icon={ShieldCheck} className="lg:col-span-2">
          <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {[
              'Compreender o funcionamento da criptografia',
              'Diferenciar criptografia simétrica e assimétrica',
              'Distinguir criptografia, descriptografia e hash',
              'Executar algoritmos criptográficos reais',
              'Comparar resultados e identificar usos no cotidiano',
              'Compreender a proteção de dados pessoais (LGPD)',
              'Registrar evidências das atividades',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Seu progresso" icon={Lock}>
          <div className="space-y-3">
            <p className="text-4xl font-extrabold text-white">
              {Math.round(overall * 100)}
              <span className="text-xl text-slate-400">%</span>
            </p>
            <ProgressBar value={overall} />
            <p className="text-xs text-slate-400">O progresso fica salvo nesta aba do navegador enquanto ela estiver aberta.</p>
          </div>
        </Card>
      </div>

      <Card title="Orientações para começar">
        <ol className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Estude os conceitos', 'Leia a Introdução e responda ao teste rápido.'],
            ['Experimente', 'Execute as Simulações e explore os Algoritmos.'],
            ['Resolva seu desafio', 'Informe apenas o seu RA — nenhum outro dado pessoal é necessário.'],
            ['Registre e entregue', 'Preencha as Evidências e gere o Relatório PDF.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <span className="font-mono text-xs text-cyan-300">Passo {i + 1}</span>
              <p className="mt-1 font-semibold text-white">{t}</p>
              <p className="mt-1 text-slate-400">{d}</p>
            </li>
          ))}
        </ol>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Módulos disponíveis</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.filter((n) => n.module).map((n, i) => {
            const p = progress[n.module!];
            const Icon = p >= 1 ? CheckCircle2 : p > 0 ? CircleDot : Circle;
            return (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-400/40 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <n.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <Icon className={cx('h-5 w-5', p >= 1 ? 'text-emerald-400' : p > 0 ? 'text-amber-400' : 'text-slate-600')} aria-hidden />
                </div>
                <p className="mt-3 text-xs font-mono text-slate-500">Módulo {i + 1}</p>
                <p className="font-semibold text-white group-hover:text-cyan-200">{n.label}</p>
                <p className="mt-1 flex-1 text-sm text-slate-400">{DESCRIPTIONS[n.id]}</p>
                <div className="mt-3">
                  <ProgressBar value={p} />
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
