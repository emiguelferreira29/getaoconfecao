import { useState } from 'react';
import { supabase } from '../supabase';
import { btnPrimary, inputStyle, labelStyle } from '../components/Modais';
import type { Artigo } from '../App';

type ItemNovaOp = { artigo: Artigo; quantidade: number; };

type Props = {
  artigos: Artigo[];
  setEcraAtual: (ecra: any) => void;
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
};

export default function NovaEncomenda({ artigos, setEcraAtual, carregarDados, mostrarAlerta }: Props) {
  const [novaOpNumero, setNovaOpNumero] = useState('');
  const [novaOpDataEntrega, setNovaOpDataEntrega] = useState('');
  const [novaOpLista, setNovaOpLista] = useState<ItemNovaOp[]>([]);
  const [novaOpArtigo, setNovaOpArtigo] = useState<Artigo | null>(null);
  const [novaOpQtd, setNovaOpQtd] = useState('');

  const adicionarItemNovaOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOpArtigo) return mostrarAlerta('Atenção', 'Selecione um artigo.', 'aviso');
    const qtd = parseInt(novaOpQtd);
    if (isNaN(qtd) || qtd <= 0) return mostrarAlerta('Atenção', 'Quantidade inválida.', 'aviso');
    setNovaOpLista([...novaOpLista, { artigo: novaOpArtigo, quantidade: qtd }]);
    setNovaOpArtigo(null); 
    setNovaOpQtd('');
  };

  const guardarNovaEncomenda = async () => {
    if (!novaOpNumero) return mostrarAlerta('Atenção', 'Indique o número da OP.', 'aviso');
    if (novaOpLista.length === 0) return mostrarAlerta('Atenção', 'Adicione pelo menos um artigo à OP.', 'aviso');
    
    const dadosParaInserir = novaOpLista.map(item => ({ 
      op_numero: novaOpNumero, 
      artigo_codigo: item.artigo.codigo, 
      artigo_nome: item.artigo.nome, 
      quantidade_pedida: item.quantidade, 
      data_entrega: novaOpDataEntrega ? novaOpDataEntrega : null 
    }));
    
    const { error } = await supabase.from('encomendas').insert(dadosParaInserir);
    
    if (error) {
      mostrarAlerta('Erro', error.message, 'erro');
    } else { 
      mostrarAlerta('Sucesso', `A ${novaOpNumero} foi registada com sucesso!`, 'sucesso'); 
      setNovaOpNumero(''); setNovaOpDataEntrega(''); setNovaOpLista([]); 
      carregarDados(); 
      setEcraAtual('home'); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Nova Encomenda (Entrada)</h2>
      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>Número da OP (ex: OP-001)</label>
        <input type="text" value={novaOpNumero} onChange={e => setNovaOpNumero(e.target.value)} required style={inputStyle} />
      </div>
      <div style={{ marginBottom: '25px' }}>
        <label style={labelStyle}>Data de Entrega (Opcional)</label>
        <input type="date" value={novaOpDataEntrega} onChange={e => setNovaOpDataEntrega(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Adicionar Material à OP</h3>
        <form onSubmit={adicionarItemNovaOp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select value={novaOpArtigo?.id || ''} onChange={e => setNovaOpArtigo(artigos.find(a => a.id === parseInt(e.target.value)) || null)} required style={inputStyle}>
            <option value="" disabled>Escolha o artigo...</option>
            {artigos.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nome}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" min="1" placeholder="Quantidade" value={novaOpQtd} onChange={e => setNovaOpQtd(e.target.value)} required style={{...inputStyle, flex: 1}} />
            <button type="submit" style={{...btnPrimary, width: 'auto', padding: '0 20px'}}>Adicionar</button>
          </div>
        </form>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Lista da OP ({novaOpLista.length})</h3>
      {novaOpLista.map((item, i) => (
        <div key={i} style={{ backgroundColor: 'var(--surface-color)', padding: '12px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{item.quantidade}x {item.artigo.nome}</span>
          <button onClick={() => setNovaOpLista(novaOpLista.filter((_, index) => index !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
        </div>
      ))}
      {novaOpLista.length > 0 && (
        <button onClick={guardarNovaEncomenda} style={{...btnPrimary, marginTop: '20px', backgroundColor: '#8b5cf6'}}>💾 Guardar OP Completa</button>
      )}
    </div>
  );
}