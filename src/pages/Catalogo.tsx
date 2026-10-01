import { useState } from 'react';
import { supabase } from '../supabase';
import { inputStyle } from '../components/Modais';
import type { Artigo } from '../App';
import jsPDF from 'jspdf';

type Props = {
  artigos: Artigo[];
  carregarDados: () => void;
  pedirConfirmacaoApagar: (id: number, tipo: 'saida' | 'artigo') => void;
};

export default function Catalogo({ artigos, carregarDados, pedirConfirmacaoApagar }: Props) {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [codigoEditado, setCodigoEditado] = useState('');
  const [precoEditado, setPrecoEditado] = useState<string>('');
  const [custoEditado, setCustoEditado] = useState<string>('');

  const iniciarEdicao = (artigo: Artigo) => {
    setEditandoId(artigo.id);
    setNomeEditado(artigo.nome);
    setCodigoEditado(artigo.codigo);
    setPrecoEditado(artigo.preco.toString());
    setCustoEditado(artigo.custo_subcontratacao ? artigo.custo_subcontratacao.toString() : '0');
  };

  const guardarEdicao = async (id: number) => {
    const precoNum = parseFloat(precoEditado.replace(',', '.'));
    const custoNum = parseFloat(custoEditado.replace(',', '.')) || 0;
    
    if (!nomeEditado || !codigoEditado || isNaN(precoNum) || precoNum < 0) return; 
    
    const { error } = await supabase.from('artigos').update({ 
      nome: nomeEditado,
      codigo: codigoEditado,
      preco: precoNum, 
      custo_subcontratacao: custoNum 
    }).eq('id', id);

    if (!error) { 
      setEditandoId(null); 
      carregarDados(); 
    }
  };

  // FUNÇÃO MÁGICA TAMBÉM NO CATÁLOGO
  const gerarPDFComQR = async (codigo: string, nome: string) => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(codigo)}`);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235);
        doc.text('Etiqueta de Artigo', 105, 30, { align: 'center' });
        
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text(nome, 105, 50, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(codigo, 105, 60, { align: 'center' });
        
        doc.addImage(base64data, 'PNG', 55, 75, 100, 100);
        
        doc.save(`QR_${codigo}.pdf`);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Catálogo ({artigos.length})</h2>
      <div style={{ display: 'grid', gap: '10px' }}>
        {artigos.map(artigo => (
          <div key={artigo.id} style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {editandoId !== artigo.id ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{artigo.nome}</strong>
                    <small style={{ color: 'var(--text-secondary)' }}>{artigo.codigo}</small>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {/* NOVO BOTÃO DE IMPRIMIR QR CODE */}
                    <button onClick={() => gerarPDFComQR(artigo.codigo, artigo.nome)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }} title="Imprimir QR Code">🖨️</button>
                    
                    <button onClick={() => iniciarEdicao(artigo)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Editar Artigo">✏️</button>
                    <button onClick={() => pedirConfirmacaoApagar(artigo.id, 'artigo')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }} title="Apagar Artigo">🗑️</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                  <span style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}>Venda: <strong>{Number(artigo.preco).toFixed(2)}€</strong></span>
                  <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>Custo Sub: <strong>{Number(artigo.custo_subcontratacao || 0).toFixed(2)}€</strong></span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nome do Artigo</label>
                    <input type="text" value={nomeEditado} onChange={e => setNomeEditado(e.target.value)} autoFocus style={{ ...inputStyle, padding: '8px' }} />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Código do Artigo</label>
                    <input type="text" value={codigoEditado} onChange={e => setCodigoEditado(e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faturação (€)</label>
                      <input type="number" step="0.01" value={precoEditado} onChange={e => setPrecoEditado(e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Subcontrato (€)</label>
                      <input type="number" step="0.01" value={custoEditado} onChange={e => setCustoEditado(e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button onClick={() => setEditandoId(null)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>✕ Cancelar</button>
                    <button onClick={() => guardarEdicao(artigo.id)} style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>✓ Guardar</button>
                  </div>
                </div>
              </>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}