import { useCallback, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FlaskConical,
  Info,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useLab } from '../store';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------------------------- Layout ---------------------------- */

export function PageHeader({ icon: Icon, kicker, title, children }: { icon: LucideIcon; kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
        <Icon className="h-4 w-4" aria-hidden /> {kicker}
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      {children && <div className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">{children}</div>}
    </header>
  );
}

export function Card({
  title,
  icon: Icon,
  children,
  actions,
  className,
  subtitle,
  id,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  subtitle?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cx('rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                {Icon && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0">{title}</span>
              </h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------------------- Controls ---------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  variant = 'primary',
  icon: Icon,
  loading,
  children,
  className,
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: LucideIcon; loading?: boolean; size?: 'sm' | 'md' }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 focus-visible:outline-cyan-300',
    success: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 focus-visible:outline-emerald-300',
    secondary: 'border border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-600 hover:bg-slate-700',
    ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white',
    danger: 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  };
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        styles[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

const fieldCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30';

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(fieldCls, 'resize-y', props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldCls, props.className)} />;
}

/* ---------------------------- Display ---------------------------- */

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' }) {
  const t = {
    slate: 'border-slate-700 bg-slate-800 text-slate-300',
    cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    violet: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', t)}>{children}</span>;
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'success' | 'danger' | 'demo';
  title?: ReactNode;
  children: ReactNode;
}) {
  const conf = {
    info: { Icon: Info, cls: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-50', ic: 'text-cyan-300' },
    warn: { Icon: AlertTriangle, cls: 'border-amber-400/30 bg-amber-400/5 text-amber-50', ic: 'text-amber-300' },
    success: { Icon: CheckCircle2, cls: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-50', ic: 'text-emerald-300' },
    danger: { Icon: XCircle, cls: 'border-rose-400/30 bg-rose-400/5 text-rose-50', ic: 'text-rose-300' },
    demo: { Icon: FlaskConical, cls: 'border-violet-400/40 bg-violet-400/5 text-violet-50', ic: 'text-violet-300' },
  }[tone];
  return (
    <div className={cx('flex gap-3 rounded-xl border p-3.5 text-sm leading-relaxed', conf.cls)} role={tone === 'danger' ? 'alert' : undefined}>
      <conf.Icon className={cx('mt-0.5 h-5 w-5 shrink-0', conf.ic)} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-slate-200">{children}</div>
      </div>
    </div>
  );
}

/** Selo exibido em toda demonstração que NÃO é criptografia real. */
export function DemoSeal({ children }: { children?: ReactNode }) {
  return (
    <Callout tone="demo" title="Demonstração conceitual — não é criptografia real">
      {children ?? 'Este exemplo é uma versão simplificada (“de brinquedo”) criada para ensinar a ideia. Não oferece segurança e não deve ser usado para proteger dados.'}
    </Callout>
  );
}

export function RealSeal({ api = 'Web Crypto API' }: { api?: string }) {
  return (
    <Badge tone="emerald">
      <Check className="h-3 w-3" aria-hidden /> Operação real · {api}
    </Badge>
  );
}

export function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* clipboard indisponível */
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
      aria-label={`${label} ${''}`}
    >
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? 'Copiado' : label}
    </button>
  );
}

export function Output({
  label,
  value,
  tone = 'slate',
  mono = true,
  hint,
  maxH = 'max-h-40',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'cyan' | 'emerald' | 'rose' | 'amber' | 'violet';
  mono?: boolean;
  hint?: ReactNode;
  maxH?: string;
}) {
  const border = { slate: 'border-slate-700', cyan: 'border-cyan-400/40', emerald: 'border-emerald-400/40', rose: 'border-rose-400/40', amber: 'border-amber-400/40', violet: 'border-violet-400/40' }[tone];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {value && <CopyButton value={value} />}
      </div>
      <div
        className={cx(
          'overflow-auto rounded-xl border bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 break-all whitespace-pre-wrap',
          border,
          maxH,
          mono && 'font-mono text-[13px]',
        )}
        aria-live="polite"
      >
        {value || <span className="text-slate-600">—</span>}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export type StatusMsg = { kind: 'success' | 'error' | 'info' | 'expected'; text: string } | null;

export function Status({ msg }: { msg: StatusMsg }) {
  if (!msg) return null;
  const c = {
    success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
    error: 'border-rose-400/40 bg-rose-400/10 text-rose-100',
    info: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100',
    expected: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  }[msg.kind];
  const Icon = msg.kind === 'success' ? CheckCircle2 : msg.kind === 'error' ? XCircle : msg.kind === 'expected' ? AlertTriangle : Info;
  return (
    <div role={msg.kind === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm animate-[fadein_.25s_ease]', c)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{msg.text}</span>
    </div>
  );
}

/** Executa uma ação assíncrona com estado de carregamento e mensagem de sucesso/erro. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<StatusMsg>(null);
  const run = useCallback(async (name: string, fn: () => Promise<string | void>) => {
    setBusy(name);
    setMsg(null);
    try {
      const text = await fn();
      if (text) setMsg({ kind: 'success', text });
      return true;
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      // Falhas provocadas de propósito (chave errada, adulteração) são o resultado ESPERADO da atividade.
      setMsg({ kind: text.startsWith('Resultado esperado') ? 'expected' : 'error', text });
      return false;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, msg, setMsg, run };
}

/* ---------------------------- Fluxograma ---------------------------- */

export interface FlowStep {
  label: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'slate' | 'rose';
  active?: boolean;
}

export function Flow({ steps, compact }: { steps: FlowStep[]; compact?: boolean }) {
  const tone = (t: FlowStep['tone'] = 'slate', active?: boolean) =>
    cx(
      'border transition',
      {
        cyan: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100',
        emerald: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
        amber: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
        violet: 'border-violet-400/40 bg-violet-400/10 text-violet-100',
        rose: 'border-rose-400/40 bg-rose-400/10 text-rose-100',
        slate: 'border-slate-700 bg-slate-800/70 text-slate-200',
      }[t],
      active && 'ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-300',
    );
  return (
    <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-center" aria-label="Fluxo do processo">
      {steps.map((s, i) => (
        <li key={i} className="contents">
          <div className={cx('flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3', compact ? 'py-2' : 'py-3', tone(s.tone, s.active))}>
            {s.icon && <s.icon className="h-5 w-5 shrink-0" aria-hidden />}
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{s.label}</p>
              {s.sub && <p className="mt-0.5 truncate font-mono text-xs opacity-80">{s.sub}</p>}
            </div>
          </div>
          {i < steps.length - 1 && (
            <span className="flex justify-center text-slate-500" aria-hidden>
              <ArrowDown className="h-4 w-4 md:hidden" />
              <ArrowRight className="hidden h-4 w-4 md:block" />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------- Perguntas ---------------------------- */

export function Question({ id, prompt, n, placeholder }: { id: string; prompt: string; n?: number | string; placeholder?: string }) {
  const { state, setAnswer } = useLab();
  const value = state.answers[id] ?? '';
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3.5">
      <label htmlFor={`q-${id}`} className="flex gap-2 text-sm font-semibold text-slate-100">
        {n !== undefined && <span className="text-cyan-300">{n}.</span>}
        <span>{prompt}</span>
      </label>
      <TextArea
        id={`q-${id}`}
        className="mt-2"
        value={value}
        placeholder={placeholder ?? 'Escreva sua resposta com suas palavras…'}
        onChange={(e) => setAnswer(id, e.target.value)}
      />
      <p className="mt-1 text-right text-[11px] text-slate-500">{value.trim() ? 'Resposta salva neste navegador' : 'Ainda sem resposta'}</p>
    </div>
  );
}

/* ---------------------------- Citações ---------------------------- */

export function Cite({ c }: { c: string }) {
  return (
    <a href="#referencias" className="whitespace-nowrap text-cyan-300/90 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-200">
      ({c})
    </a>
  );
}

/* ---------------------------- Abas ---------------------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; icon?: LucideIcon; done?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
            value === t.id ? 'border-cyan-400/50 bg-cyan-400/15 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white',
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" aria-hidden />}
          {t.label}
          {t.done && <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="concluído" />}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span className="font-mono">{pct}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-slate-400">{k}</dt>
          <dd className="text-slate-100">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
