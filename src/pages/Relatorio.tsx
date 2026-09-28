import { useState } from 'react';
import type { Saida, Subcontrato, Encomenda } from '../App';

type Props = {
  saidas: Saida[];
  subcontratos: Subcontrato[];
  encomendas: Encomenda[];
  anularOP: (op_numero: string) => void;
};

export default function Relatorio({ saidas, subcontratos, encomendas, anularOP }: Props) {
  const [detalheVisivel, setDetalheVisivel] = useState(false);
  const [opAtiva, setOpAtiva] = useState<any>(null);

  const agruparFinanceiroOP = () => {
    const ops: Record<string, { op_numero: string; faturado: number; custo: number; saidas: Saida[]; subs: Subcontrato[]; cliente_final: string | null }> = {};
    
    saidas.forEach(s => {
      const op = s.op_numero || 'Avulso';
      if (!ops[op]) ops[op] = { op_numero: op, faturado: 0, custo: 0, saidas: [], subs: [], cliente_final: null };
      ops[op].faturado += Number(s.total_faturado);
      ops[op].saidas.push(s);
    });

    subcontratos.forEach(sub => {
      const op = sub.op_numero;
      if (!ops[op]) ops[op] = { op_numero: op, faturado: 0, custo: 0, saidas: [], subs: [], cliente_final: null };
      ops[op].custo += Number(sub.custo_total);
      ops[op].subs.push(sub);
    });

    // Adicionar a informação do Cliente Final cruzando com as Encomendas
    Object.keys(ops).forEach(opNum => {
      const enc = encomendas.find(e => e.op_numero === opNum && e.cliente_final);
      if (enc) {
        // O "|| null" resolve o erro do TypeScript de "undefined"
        ops[opNum].cliente_final = enc.cliente_final || null;
      }
    });

    return Object.values(ops).sort((a, b) => b.faturado - a.faturado);
  };

  const dados = agruparFinanceiroOP();
  
  const globalFaturado = saidas.reduce((sum, s) => sum + Number(s.total_faturado), 0);
  const globalCustos = subcontratos.reduce((sum, s) => sum + Number(s.custo_total), 0);
  const globalLucro = globalFaturado - globalCustos;

  const abrirDetalhe = (grupo: any) => {
    setOpAtiva(grupo);
    setDetalheVisivel(true);
  };

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
                  
                  {/* NÚMERO DA OP AGORA É CLICÁVEL */}
                  <strong 
                    onClick={() => abrirDetalhe(grupo)}
                    style={{ fontSize: '1.2rem', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                    title="Clique para ver os artigos"
                  >
                    {grupo.op_numero}
                  </strong>
                  
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
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '5px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Custos:</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>Subcontratação total</span>
                        <span style={{ color: '#ef4444' }}>{grupo.custo.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}

                  {/* BOTÃO PARA ANULAR A OP */}
                  {grupo.op_numero !== 'Avulso' && (
                    <button 
                      onClick={() => anularOP(grupo.op_numero)}
                      style={{
                        marginTop: '15px', padding: '10px', backgroundColor: 'transparent',
                        border: '1px dashed #ef4444', color: '#ef4444', borderRadius: '8px',
                        cursor: 'pointer', width: '100%', fontWeight: 'bold'
                      }}
                    >
                      ↩️ Anular OP e Repor nos Pendentes
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP (MODAL) COM OS DETALHES DOS ARTIGOS E CLIENTE */}
      {detalheVisivel && opAtiva && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s' }}>
          <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', padding: '25px', width: '100%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '1.4rem' }}>{opAtiva.op_numero}</h3>
              <button onClick={() => setDetalheVisivel(false)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer', padding: '0' }}>✕</button>
            </div>
            
            {opAtiva.cliente_final && (
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>👤 Cliente / Referência:</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '4px' }}>{opAtiva.cliente_final}</strong>
              </div>
            )}
            
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', color: 'var(--text-secondary)' }}>Peças Expedidas:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
               {opAtiva.saidas.map((s: Saida, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                     <span><strong>{s.quantidade}x</strong> {s.artigo_nome}</span>
                     <strong style={{color: '#22c55e'}}>{Number(s.total_faturado).toFixed(2)}€</strong>
                  </div>
               ))}
               <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Faturado</span>
                  <strong style={{color: '#22c55e', fontSize: '1.1rem'}}>{opAtiva.faturado.toFixed(2)}€</strong>
               </div>
            </div>

            {opAtiva.subs.length > 0 && (
              <>
                <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', color: 'var(--text-secondary)' }}>Custos (Subcontratos):</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   {opAtiva.subs.map((sub: Subcontrato, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                         <div>
                            <span><strong>{sub.quantidade}x</strong> {sub.artigo_nome}</span>
                            <small style={{ display: 'block', color: 'var(--text-secondary)' }}>Para: {sub.subcontratado_a || 'Desconhecido'}</small>
                         </div>
                         <strong style={{color: '#ef4444'}}>{Number(sub.custo_total).toFixed(2)}€</strong>
                      </div>
                   ))}
                   <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Custos</span>
                      <strong style={{color: '#ef4444', fontSize: '1.1rem'}}>{opAtiva.custo.toFixed(2)}€</strong>
                   </div>
                </div>
              </>
            )}

            <button onClick={() => setDetalheVisivel(false)} style={{ width: '100%', padding: '12px', marginTop: '25px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}