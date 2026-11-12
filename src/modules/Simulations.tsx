import { useState } from 'react';
import { Fingerprint, FlaskConical, KeyRound, KeySquare, Type } from 'lucide-react';
import { useLab } from '../store';
import { Card, PageHeader, Tabs } from '../components/ui';
import { CaesarTool } from '../components/tools/CaesarTool';
import { AesTool } from '../components/tools/AesTool';
import { RsaTool } from '../components/tools/RsaTool';
import { ShaTool } from '../components/tools/ShaTool';

type Tab = 'cesar' | 'aes' | 'rsa' | 'sha';

function initialTab(): Tab {
  try {
    const t = sessionStorage.getItem('criptolab:simTab') as Tab | null;
    sessionStorage.removeItem('criptolab:simTab');
    if (t && ['cesar', 'aes', 'rsa', 'sha'].includes(t)) return t;
  } catch {
    /* ignore */
  }
  return 'cesar';
}

export default function Simulations() {
  const { state } = useLab();
  const [tab, setTab] = useState<Tab>(initialTab);
  const m = state.milestones;
  return (
    <div className="space-y-6">
      <PageHeader icon={FlaskConical} kicker="Módulo 3" title="Simulações de criptografia">
        Ferramentas interativas. A Cifra de César é uma cifra clássica didática; AES-256-GCM, RSA-OAEP e SHA-256 são executados <strong>de verdade</strong> pela Web Crypto
        API do seu navegador, sem enviar nada para a internet.
      </PageHeader>
      <Tabs
        label="Simulações"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'cesar', label: 'A. Cifra de César', icon: Type, done: !!m['sim:cesar'] },
          { id: 'aes', label: 'B. AES-256-GCM', icon: KeyRound, done: !!m['sim:aes'] },
          { id: 'rsa', label: 'C. RSA-OAEP', icon: KeySquare, done: !!m['sim:rsa'] },
          { id: 'sha', label: 'D. SHA-256', icon: Fingerprint, done: !!m['sim:sha'] },
        ]}
      />
      <div role="tabpanel">
        {tab === 'cesar' && (
          <Card title="A. Cifra de César" subtitle="Cada letra é deslocada um número fixo de posições no alfabeto.">
            <CaesarTool module="simulacoes" milestone="sim:cesar" />
          </Card>
        )}
        {tab === 'aes' && (
          <Card title="B. AES-256-GCM" subtitle="Criptografia simétrica autenticada: a mesma chave cifra e decifra.">
            <AesTool module="simulacoes" milestone="sim:aes" />
          </Card>
        )}
        {tab === 'rsa' && (
          <Card title="C. RSA-OAEP" subtitle="Criptografia assimétrica: a chave pública cifra, a chave privada decifra.">
            <RsaTool module="simulacoes" milestone="sim:rsa" />
          </Card>
        )}
        {tab === 'sha' && (
          <Card title="D. SHA-256" subtitle="Função de hash: gera um resumo de 256 bits, sem chave e sem volta.">
            <ShaTool module="simulacoes" milestone="sim:sha" />
          </Card>
        )}
      </div>
    </div>
  );
}
