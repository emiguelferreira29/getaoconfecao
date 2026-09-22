import { useState } from 'react';
import { supabase } from '../supabase';
import { btnPrimary, btnSecondary, inputStyle, labelStyle } from '../components/Modais';
import type { Encomenda } from '../App';

type Props = {
  encomendas: Encomenda[];
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
  pedirConfirmacaoApagarEncomenda: (op_numero: string) => void;
};

export default function EncomendasPendentes({ encomendas, carregarDados, mostrarAlerta, pedirConfirmacaoApagarEncomenda }: Props) {
  const [editandoOpId, setEditandoOpId] = useState<string | null>(null);
  const [editOpData, setEditOpData] = useState<string>('');
  const [editOpQuantidades, setEditOpQuantidades] = useState<Record<number, number>>({});

  const agruparEncomendasPendentes = () => {
    const grupos: Record<string, { op_numero: string; data_entrega: string | null; cliente_final: string | null; itens: Encomenda[] }> = {};
    encomendas.filter(e => e.estado === 'pendente').forEach(enc => { 
      if (!grupos[enc.op_numero]) grupos[enc.op_numero] = { op_numero: enc.op_numero, data_entrega: enc.data_entrega || null, cliente_final: enc.cliente_final || null, itens: [] }; 
      grupos[enc.op_numero].itens.push(enc); 
    });
    return Object.values(grupos).sort((a, b) => { 
      const dataA = a.data_entrega ? new Date(a.data_entrega).getTime() : Infinity; 
      const dataB = b.data_entrega ? new Date(b.data_entrega).getTime() : Infinity; 
      return dataA - dataB; 
    });
  };

  const calcularStatusData = (dataStr: string | null) => {
    if (!dataStr) return { corBorda: 'var(--border-color)', icone: '📅', texto: 'Sem prazo definido' };
    const dataEntrega = new Date(dataStr); const hoje = new Date(); dataEntrega.setHours(0,0,0,0); hoje.setHours(0,0,0,0);
    const diffTime = dataEntrega.getTime() - hoje.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { corBorda: '#ef4444', icone: '🔴', texto: `Atrasada (${Math.abs(diffDays)} dias)` };
    if (diffDays <= 5) return { corBorda: '#eab308', icone: '🟡', texto: `Atenção: Falta(m) ${diffDays} dia(s)` };
    return { corBorda: '#22c55e', icone: '🟢', texto: `No prazo (${new Date(dataStr).toLocaleDateString('pt-PT')})` };
  };

  const iniciarEdicaoOp = (grupo: any) => {
    setEditandoOpId(grupo.op_numero); setEditOpData(grupo.data_entrega || '');
    const qtds: Record<number, number> = {};
    grupo.itens.forEach((item: Encomenda) => { qtds[item.id] = item.quantidade_pedida; });
    setEditOpQuantidades(qtds);
  };

  const guardarEdicaoOp = async (op_numero: string) => {
    try {
      const itensParaAtualizar = Object.keys(editOpQuantidades);
      for (const idStr of itensParaAtualizar) {
        const id = parseInt(idStr); const qtd = editOpQuantidades[id];
        const { error } = await supabase.from('encomendas').update({ quantidade_pedida: qtd, data_entrega: editOpData ? editOpData : null }).eq('id', id);
        if (error) throw error;
      }
      mostrarAlerta('Sucesso', `A ${op_numero} foi atualizada!`, 'sucesso'); 
      setEditandoOpId(null); carregarDados();
    } catch (err: any) { mostrarAlerta('Erro ao atualizar', err.message, 'erro'); }
  };

  const gruposPendentes = agruparEncomendasPendentes();

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Encomendas por Entregar</h2>
      {gruposPendentes.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Não existem encomendas pendentes.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {gruposPendentes.map(grupo => {
            const status = calcularStatusData(grupo.data_entrega);
            return (
              <div key={grupo.op_numero} style={{ backgroundColor: 'var(--surface-color)', border: `2px solid ${status.corBorda}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <strong style={{ fontSize: '1.2rem', display: 'block' }}>{grupo.op_numero}</strong>
                    {grupo.cliente_final && <small style={{ color: 'var(--text-secondary)' }}>👤 {grupo.cliente_final}</small>}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{status.icone} {status.texto}</div>
                    {editandoOpId !== grupo.op_numero && (
                      <>
                        <button onClick={() => iniciarEdicaoOp(grupo)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }} title="Editar OP">✏️</button>
                        <button onClick={() => pedirConfirmacaoApagarEncomenda(grupo.op_numero)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }} title="Apagar OP">🗑️</button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ padding: '15px' }}>
                  {editandoOpId === grupo.op_numero ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.2s' }}>
                      <div><label style={{...labelStyle, fontSize: '0.85rem'}}>Nova Data de Entrega:</label><input type="date" value={editOpData} onChange={e => setEditOpData(e.target.value)} style={{...inputStyle, padding: '8px'}} /></div>
                      <div>
                        <label style={{...labelStyle, fontSize: '0.85rem'}}>Ajustar Quantidades (Faltam entregar):</label>
                        {grupo.itens.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.95rem' }}>{item.artigo_nome}</span>
                            <input type="number" min="1" value={editOpQuantidades[item.id] || ''} onChange={e => setEditOpQuantidades({...editOpQuantidades, [item.id]: parseInt(e.target.value) || 0})} style={{...inputStyle, width: '90px', padding: '6px', textAlign: 'center'}} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setEditandoOpId(null)} style={{...btnSecondary, padding: '10px', flex: 1}}>Cancelar</button>
                        <button onClick={() => guardarEdicaoOp(grupo.op_numero)} style={{...btnPrimary, backgroundColor: '#22c55e', padding: '10px', flex: 1}}>Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <><h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Falta produzir/entregar:</h4>{grupo.itens.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}><span>{item.artigo_nome}</span><strong style={{ color: 'var(--primary-color)' }}>{item.quantidade_pedida} un.</strong></div>)}</>
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