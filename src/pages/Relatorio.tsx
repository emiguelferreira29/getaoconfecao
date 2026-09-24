import type { Saida, Subcontrato } from '../App';

type Props = {
  saidas: Saida[];
  subcontratos: Subcontrato[];
};

export default function Relatorio({ saidas, subcontratos }: Props) {
  
  // Agrupar financeiramente por Ordem de Produção (OP)
  const agruparFinanceiroOP = () => {
    const ops: Record<string, { op_numero: string; faturado: number; custo: number; saidas: Saida[]; subs: Subcontrato[] }> = {};
    
    // Processar todas as vendas (faturação)
    saidas.forEach(s => {
      const op = s.op_numero || 'Avulso';
      if (!ops[op]) ops[op] = { op_numero: op, faturado: 0, custo: 0, saidas: [], subs: [] };
      ops[op].faturado += Number(s.total_faturado);
      ops[op].saidas.push(s);
    });

    // Processar todos os custos (subcontratações)
    subcontratos.forEach(sub => {
      const op = sub.op_numero;
      if (!ops[op]) ops[op] = { op_numero: op, faturado: 0, custo: 0, saidas: [], subs: [] };
      ops[op].custo += Number(sub.custo_total);
      ops[op].subs.push(sub);
    });

    // Ordenar as OPs da que faturou mais para a que faturou menos
    return Object.values(ops).sort((a, b) => b.faturado - a.faturado);
  };

  const dados = agruparFinanceiroOP();
  
  // Totais Globais
  const globalFaturado = saidas.reduce((sum, s) => sum + Number(s.total_faturado), 0);
  const globalCustos = subcontratos.reduce((sum, s) => sum + Number(s.custo_total), 0);
  const globalLucro = globalFaturado - globalCustos;

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Faturação e Custos</h2>
      
      {/* PAINEL DE TOTAIS GLOBAIS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', border: '1px solid #22c55e' }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 5px 0', fontSize: '0.85rem' }}>Total Faturado</p>
          <h3 style={{ margin: 0, color: '#22c55e', fontSize: '1.4rem' }}>{globalFaturado.toFixed(2)}€</h3>
        </div>
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', border: '1px solid #ef4444' }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 5px 0', fontSize: '0.85rem' }}>Total Custos</p>
          <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.4rem' }}>{globalCustos.toFixed(2)}€</h3>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '15px', borderRadius: '12px', gridColumn: 'span 2' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 5px 0', fontSize: '0.85rem' }}>Balanço Global (Lucro)</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>{globalLucro.toFixed(2)}€</h3>
        </div>
      </div>

      {/* LISTAGEM POR ORDEM DE PRODUÇÃO */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--text-secondary)' }}>Detalhe por Encomenda (OP)</h3>
      {dados.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhum movimento registado.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {dados.map(grupo => {
            const lucro = grupo.faturado - grupo.custo;
            return (
              <div key={grupo.op_numero} style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>{grupo.op_numero}</strong>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: lucro >= 0 ? '#22c55e' : '#ef4444' }}>
                      {lucro >= 0 ? '+' : ''}{lucro.toFixed(2)}€
                    </div>
                    <small style={{ color: 'var(--text-secondary)' }}>Lucro da OP</small>
                  </div>
                </div>
                
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Faturado:</span>
                    <strong style={{ color: '#22c55e' }}>{grupo.faturado.toFixed(2)}€</strong>
                  </div>
                  
                  {grupo.subs.length > 0 && (
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Custos (Subcontratação):</span>
                      {grupo.subs.map(sub => (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginLeft: '10px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-primary)' }}>- {sub.quantidade}x {sub.artigo_nome} ({sub.subcontratado_a || 'Desconhecido'})</span>
                          <span style={{ color: '#ef4444' }}>{Number(sub.custo_total).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}