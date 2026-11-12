import { BookOpen, ClipboardCheck, Cpu, FileText, FlaskConical, Home, Target, UserLock, type LucideIcon } from 'lucide-react';
import type { ModuleId } from './store';

export type RouteId = 'inicio' | 'introducao' | 'algoritmos' | 'simulacoes' | 'desafios' | 'protecao' | 'evidencias' | 'relatorio' | 'referencias';

export const NAV: { id: RouteId; label: string; icon: LucideIcon; module?: ModuleId }[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'introducao', label: 'Introdução', icon: BookOpen, module: 'introducao' },
  { id: 'algoritmos', label: 'Algoritmos', icon: Cpu, module: 'algoritmos' },
  { id: 'simulacoes', label: 'Simulações', icon: FlaskConical, module: 'simulacoes' },
  { id: 'desafios', label: 'Desafios por RA', icon: Target, module: 'desafio' },
  { id: 'protecao', label: 'Proteção de dados pessoais', icon: UserLock, module: 'protecao' },
  { id: 'evidencias', label: 'Evidências', icon: ClipboardCheck, module: 'evidencias' },
  { id: 'relatorio', label: 'Relatório', icon: FileText, module: 'relatorio' },
];

export const MODULE_LABEL: Record<ModuleId, string> = {
  introducao: 'Introdução à criptografia',
  algoritmos: 'Laboratório de algoritmos',
  simulacoes: 'Simulações de criptografia',
  desafio: 'Desafio por RA',
  protecao: 'Proteção de dados pessoais',
  evidencias: 'Evidências da atividade',
  relatorio: 'Relatório final',
};

export function go(route: RouteId) {
  window.location.hash = route;
}
