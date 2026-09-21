import { btnPrimary, btnSecondary } from '../components/Modais';
import type { Encomenda, Saida } from '../App';

type Props = {
  encomendas: Encomenda[];
  saidas: Saida[];
  agruparSaidas: () => any[];
  gerarPDF: (grupo: any, comPrecos: boolean) => void;
  pedirConfirmacaoApagarEncomenda: (op_numero: string) => void;
};

export default function EncomendasConcluidas({ encomendas, saidas, agruparSaidas, gerarPDF, pedirConfirmacaoApagarEncomenda }: Props) {
  
  const agruparEncomendasConcluidas = () => {
    const grupos: Record<string, { op_numero: string; itens: Encomenda[] }> = {};
    encomendas.filter(e => e.estado === 'concluida').forEach(enc => { 
      if (!grupos[enc.op_numero]) grupos[enc.op_numero] = { op_numero: enc.op_numero, itens: [] }; 
      grupos[enc.op_numero].itens.push(enc); 
    });
    return Object.values(grupos);
  };

  const obterLotesDaOP = (op_numero: string) => { 
    const lotes = saidas.filter(s => s.op_numero === op_numero && s.lote_id).map(s => s.lote_id as string); 
    return Array.from(new Set(lotes)); 
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>OPs Concluídas</h2>
      {encomendas.filter(e => e.estado === 'concluida').length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Não existem OPs concluídas registadas.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {agruparEncomendasConcluidas().map(grupo => {
            const lotesAssociados = obterLotesDaOP(grupo.op_numero);
            return (
              <div key={grupo.op_numero} style={{ backgroundColor: 'var(--surface-color)', border: `1px solid var(--border-color)`, borderRadius: '12px', overflow: 'hidden', opacity: 0.85 }}>
                <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.2rem', color: '#22c55e' }}>✅ {grupo.op_numero}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Finalizada</span>
                    <button onClick={() => pedirConfirmacaoApagarEncomenda(grupo.op_numero)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }} title="Apagar OP">🗑️</button>
                  </div>
                </div>
                {lotesAssociados.length > 0 && (
                  <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Guias de Expedição Associadas:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {lotesAssociados.map(loteId => (
                        <div key={loteId} style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--primary-color)' }}>📦 {loteId}</div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { const loteData = agruparSaidas().find(g => g.lote_id === loteId); if (loteData) gerarPDF(loteData, false); }} style={{ ...btnSecondary, padding: '8px', fontSize: '0.85rem', flex: 1 }}>📄 Guia Cliente</button>
                            <button onClick={() => { const loteData = agruparSaidas().find(g => g.lote_id === loteId); if (loteData) gerarPDF(loteData, true); }} style={{ ...btnPrimary, padding: '8px', fontSize: '0.85rem', flex: 1 }}>📄 Guia Interna</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}