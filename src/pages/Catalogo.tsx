import { useState } from 'react';
import { supabase } from '../supabase';
import { inputStyle } from '../components/Modais';

type Artigo = { id: number; codigo: string; nome: string; preco: number; };

type Props = {
  artigos: Artigo[];
  carregarDados: () => void;
  pedirConfirmacaoApagar: (id: number, tipo: 'saida' | 'artigo') => void;
};

export default function Catalogo({ artigos, carregarDados, pedirConfirmacaoApagar }: Props) {
  const [editandoPrecoId, setEditandoPrecoId] = useState<number | null>(null);
  const [precoEditado, setPrecoEditado] = useState<string>('');

  const guardarNovoPreco = async (id: number) => {
    const precoNum = parseFloat(precoEditado.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) return; 
    
    const { error } = await supabase.from('artigos').update({ preco: precoNum }).eq('id', id);
    if (!error) { 
      setEditandoPrecoId(null); 
      carregarDados(); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Catálogo ({artigos.length})</h2>
      <div style={{ display: 'grid', gap: '10px' }}>
        {artigos.map(artigo => (
          <div key={artigo.id} style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem' }}>{artigo.nome}</strong>
              <small style={{ color: 'var(--text-secondary)' }}>{artigo.codigo}</small>
            </div>
            
            {editandoPrecoId === artigo.id ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="number" step="0.01" value={precoEditado} onChange={e => setPrecoEditado(e.target.value)} autoFocus style={{ ...inputStyle, width: '80px', padding: '8px' }} />
                <button onClick={() => guardarNovoPreco(artigo.id)} style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                <button onClick={() => setEditandoPrecoId(null)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.1rem', marginRight: '4px' }}>
                  {Number(artigo.preco).toFixed(2)}€
                </span>
                <button onClick={() => { setEditandoPrecoId(artigo.id); setPrecoEditado(artigo.preco.toString()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }} title="Editar Preço">✏️</button>
                <button onClick={() => pedirConfirmacaoApagar(artigo.id, 'artigo')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }} title="Apagar Artigo">🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}