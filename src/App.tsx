import { useEffect, useState } from 'react';
import { Library, Lock, Menu, ShieldCheck, X } from 'lucide-react';
import { useLab } from './store';
import { NAV, type RouteId } from './nav';
import { isWebCryptoAvailable } from './lib/crypto';
import { Callout, ProgressBar, cx } from './components/ui';
import Home from './modules/Home';
import Intro from './modules/Intro';
import Algorithms from './modules/Algorithms';
import Simulations from './modules/Simulations';
import Challenges from './modules/Challenges';
import DataProtection from './modules/DataProtection';
import Evidence from './modules/Evidence';
import Report from './modules/Report';
import References from './modules/References';

const ROUTES = new Set<RouteId>([...NAV.map((n) => n.id), 'referencias']);

function readRoute(): RouteId {
  const h = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] as RouteId;
  return ROUTES.has(h) ? h : 'inicio';
}


export default function App() {
  const [route, setRoute] = useState<RouteId>(readRoute);
  const [open, setOpen] = useState(false);
  const { progress, overall, state } = useLab();

  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      setOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const Page = {
    inicio: Home,
    introducao: Intro,
    algoritmos: Algorithms,
    simulacoes: Simulations,
    desafios: Challenges,
    protecao: DataProtection,
    evidencias: Evidence,
    relatorio: Report,
    referencias: References,
  }[route];

  const nav = (
    <nav aria-label="Módulos do laboratório" className="flex h-full flex-col">
      <a href="#inicio" className="flex items-center gap-3 px-4 pb-5 pt-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-base font-bold leading-tight text-white">CriptoLab</span>
          <span className="block text-[11px] text-slate-400">Laboratório de Criptografia</span>
        </span>
      </a>
      <ul className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((n, i) => {
          const p = n.module ? progress[n.module] : undefined;
          const active = route === n.id;
          return (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-cyan-400/15 text-white' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
                )}
              >
                <span className={cx('font-mono text-[11px]', active ? 'text-cyan-300' : 'text-slate-600')}>{i + 1}</span>
                <n.icon className={cx('h-4 w-4 shrink-0', active ? 'text-cyan-300' : '')} aria-hidden />
                <span className="flex-1 leading-tight">{n.label}</span>
                {p !== undefined && (
                  <span
                    className={cx('h-2 w-2 rounded-full', p >= 1 ? 'bg-emerald-400' : p > 0 ? 'bg-amber-400' : 'bg-slate-700')}
                    title={p >= 1 ? 'Concluído' : p > 0 ? 'Em andamento' : 'Não iniciado'}
                    aria-label={p >= 1 ? 'concluído' : p > 0 ? 'em andamento' : 'não iniciado'}
                  />
                )}
              </a>
            </li>
          );
        })}
        <li className="pt-2">
          <a
            href="#referencias"
            aria-current={route === 'referencias' ? 'page' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
              route === 'referencias' ? 'bg-cyan-400/15 text-white' : 'text-slate-500 hover:bg-slate-800/70 hover:text-white',
            )}
          >
            <span className="w-[11px]" />
            <Library className="h-4 w-4" aria-hidden /> Referências
          </a>
        </li>
      </ul>
      <div className="border-t border-slate-800 p-4">
        <ProgressBar value={overall} label="Progresso da atividade" />
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          {state.ra ? `RA final ${state.ra.replace(/\D/g, '').slice(-2)}` : 'Tudo roda localmente no navegador'}
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#0b1220] text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(52,211,153,0.06),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Barra superior (celular/tablet) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#0b1220]/90 px-4 py-3 backdrop-blur lg:hidden">
        <a href="#inicio" className="flex items-center gap-2 font-bold text-white">
          <Lock className="h-5 w-5 text-cyan-300" aria-hidden /> CriptoLab
        </a>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800" aria-label="Abrir menu" aria-expanded={open}>
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Menu lateral fixo (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-800 bg-slate-950/70 backdrop-blur lg:block">{nav}</aside>

      {/* Menu em gaveta (celular) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-xs border-r border-slate-800 bg-slate-950 shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="relative lg:pl-72">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          {!isWebCryptoAvailable() && (
            <div className="mb-6">
              <Callout tone="danger" title="Web Crypto API indisponível">
                As operações reais de criptografia precisam de um contexto seguro (HTTPS ou localhost) e de um navegador atualizado. Abra o laboratório pelo endereço
                publicado na Vercel ou com <code>npm run dev</code>.
              </Callout>
            </div>
          )}
          <Page />
          <footer className="mt-16 border-t border-slate-800 pt-6 text-xs text-slate-500">
            CriptoLab · Atividade prática de Segurança da Informação · Todas as operações acontecem no seu navegador; nenhum dado é enviado a servidores.{' '}
            <a className="text-cyan-300/80 hover:underline" href="#referencias">
              Referências
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
