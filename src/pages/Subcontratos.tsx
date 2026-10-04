import { useState } from 'react';
import { supabase } from '../supabase';
import { btnPrimary, btnSecondary, inputStyle } from '../components/Modais';
import type { Subcontrato } from '../App';

type Props = {
  subcontratos: Subcontrato[];
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
};

export default function Subcontratos({ subcontratos, carregarDados, mostrarAlerta }: Props) {
  
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editArtigoNome, setEditArtigoNome] = useState('');
  const [editQuantidade, setEditQuantidade] = useState('');
  const [editCusto, setEditCusto] = useState('');
  const [editSubcontratado, setEditSubcontratado] = useState('');

  // NOVO: Estado para o Modal de Confirmação (serve para Editar e para Apagar)
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    aberto: boolean;
    id: number | null;
    tipo: 'editar' | 'apagar' | null;
    titulo: string;
    mensagem: string;
  }>({ aberto: false, id: null, tipo: null, titulo: '', mensagem: '' });

  // 1. Prepara a anulação e abre o modal
  const pedirConfirmacaoApagar = (id: number, artigo: string, op: string) => {
    setModalConfirmacao({
      aberto: true,
      id,
      tipo: 'apagar',
      titulo: 'Anular Subcontratação',
      mensagem: `Tem a certeza que deseja anular a subcontratação de ${artigo} da OP ${op}?`
    });
  };

  const iniciarEdicao = (item: Subcontrato) => {
    setEditandoId(item.id);
    setEditArtigoNome(item.artigo_nome);
    setEditQuantidade(item.quantidade.toString());
    setEditCusto(item.custo_total.toString());
    setEditSubcontratado(item.subcontratado_a || 'Ana');
  };

  // 2. Valida os campos da edição e abre o modal
  const pedirConfirmacaoEdicao = (id: number) => {
    const qtdNum = parseInt(editQuantidade);
    const custoNum = parseFloat(editCusto.replace(',', '.'));
    
    if (!editArtigoNome || isNaN(qtdNum) || isNaN(custoNum) || !editSubcontratado) {
      return mostrarAlerta('Atenção', 'Preencha todos os campos corretamente.', 'aviso');
    }

    setModalConfirmacao({
      aberto: true,
      id,
      tipo: 'editar',
      titulo: 'Confirmar Alteração',
      mensagem: 'Pretende guardar as novas alterações feitas a este subcontrato?'
    });
  };

  // 3. Executa a ação final (Apagar ou Editar) depois do utilizador dizer "Sim"
  const confirmarAcaoModal = async () => {
    const { id, tipo } = modalConfirmacao;
    if (!id || !tipo) return;

    if (tipo === 'apagar') {
      const { error } = await supabase.from('subcontratos').delete().eq('id', id);
      if (error) mostrarAlerta('Erro', error.message, 'erro');
      else { 
        mostrarAlerta('Sucesso', 'Registo de subcontratação anulado.', 'sucesso'); 
        carregarDados(); 
      }
    } 
    else if (tipo === 'editar') {
      const qtdNum = parseInt(editQuantidade);
      const custoNum = parseFloat(editCusto.replace(',', '.'));
      
      const { error } = await supabase.from('subcontratos').update({
        artigo_nome: editArtigoNome,
        quantidade: qtdNum,
        custo_total: custoNum,
        subcontratado_a: editSubcontratado
      }).eq('id', id);

      if (error) {
        mostrarAlerta('Erro', error.message, 'erro');
      } else {
        mostrarAlerta('Sucesso', 'Subcontrato atualizado com sucesso!', 'sucesso');
        setEditandoId(null);
        carregarDados();
      }
    }

    // Fecha o modal no fim
    setModalConfirmacao({ aberto: false, id: null, tipo: null, titulo: '', mensagem: '' });
  };

  const fecharModal = () => setModalConfirmacao({ aberto: false, id: null, tipo: null, titulo: '', mensagem: '' });

  const agruparPorSubcontratado = () => {
    const grupos: Record<string, { nome: string; itens: Subcontrato[]; totalPecas: number; totalCusto: number }> = {};
    subcontratos.forEach(sub => {
      const nome = sub.subcontratado_a?.trim() || 'Não Especificado (Sem Nome)';
      if (!grupos[nome]) grupos[nome] = { nome, itens: [], totalPecas: 0, totalCusto: 0 };
      grupos[nome].itens.push(sub);
      grupos[nome].totalPecas += Number(sub.quantidade);
      grupos[nome].totalCusto += Number(sub.custo_total);
    });
    return Object.values(grupos).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const dados = agruparPorSubcontratado();

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Artigos Subcontratados</h2>
      
      {dados.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>Não existem registos de artigos em subcontratação.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {dados.map(grupo => (
            <div key={grupo.nome} style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              
              <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#eab308', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🤝 {grupo.nome}</h3>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{grupo.totalPecas} un.</strong>
                  <small style={{ color: 'var(--text-secondary)' }}>{grupo.totalCusto.toFixed(2)}€</small>
                </div>
              </div>

              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grupo.itens.map(item => (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    
                    {editandoId === item.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px dashed #3b82f6', animation: 'fadeIn 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#3b82f6' }}>Editar OP: {item.op_numero}</strong>
                        </div>
                        <input type="text" value={editArtigoNome} onChange={e => setEditArtigoNome(e.target.value)} style={inputStyle} placeholder="O que está a subcontratar?" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qtd.</label><input type="number" min="1" value={editQuantidade} onChange={e => setEditQuantidade(e.target.value)} style={inputStyle} /></div>
                          <div><label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Custo (€)</label><input type="number" step="0.01" value={editCusto} onChange={e => setEditCusto(e.target.value)} style={inputStyle} /></div>
                        </div>
                        <select value={editSubcontratado} onChange={e => setEditSubcontratado(e.target.value)} style={inputStyle}>
                          <option value="Ana">Ana</option>
                        </select>
                        <div style={{ display: 'flex', gap: '10px' }}>
                           <button onClick={() => setEditandoId(null)} style={{...btnSecondary, padding: '10px', flex: 1}}>Cancelar</button>
                           {/* AQUI CHAMA A CONFIRMAÇÃO */}
                           <button onClick={() => pedirConfirmacaoEdicao(item.id)} style={{...btnPrimary, backgroundColor: '#22c55e', padding: '10px', flex: 1}}>Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#3b82f6', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>OP: {item.op_numero}</strong>
                          <span style={{ color: 'var(--text-primary)' }}>{item.quantidade}x {item.artigo_nome}</span>
                          <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '4px' }}>Data de envio: {new Date(item.data).toLocaleDateString('pt-PT')}</small>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ color: '#ef4444' }}>{Number(item.custo_total).toFixed(2)}€</strong>
                          <button onClick={() => iniciarEdicao(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '5px' }} title="Editar Subcontrato">✏️</button>
                          {/* AQUI CHAMA A CONFIRMAÇÃO DO APAGAR */}
                          <button onClick={() => pedirConfirmacaoApagar(item.id, item.artigo_nome, item.op_numero)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', padding: '5px' }} title="Anular Subcontratação">🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
            </div>
          ))}
        </div>
      )}

      {/* --- O NOVO MODAL DE CONFIRMAÇÃO BONITO --- */}
      {modalConfirmacao.aberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s' }}>
          <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', padding: '25px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            <h3 style={{ margin: '0 0 15px 0', color: modalConfirmacao.tipo === 'apagar' ? '#ef4444' : '#3b82f6', fontSize: '1.4rem' }}>
              {modalConfirmacao.titulo}
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '1rem', lineHeight: '1.5' }}>
              {modalConfirmacao.mensagem}
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={fecharModal} style={{ ...btnSecondary, flex: 1, padding: '12px' }}>
                Cancelar
              </button>
              <button 
                onClick={confirmarAcaoModal} 
                style={{ ...btnPrimary, flex: 1, padding: '12px', backgroundColor: modalConfirmacao.tipo === 'apagar' ? '#ef4444' : '#22c55e' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}