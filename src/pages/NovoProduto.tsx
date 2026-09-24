import { useState } from 'react';
import { supabase } from '../supabase';
import { btnPrimary, inputStyle, labelStyle } from '../components/Modais';

type Props = {
  setEcraAtual: (ecra: any) => void;
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
};

export default function NovoProduto({ setEcraAtual, carregarDados, mostrarAlerta }: Props) {
  const [novoCod, setNovoCod] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoCustoSub, setNovoCustoSub] = useState('');

  const registarNovoProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(novoPreco.replace(',', '.'));
    const custoSubNum = parseFloat(novoCustoSub.replace(',', '.')) || 0; // Se não colocar nada, fica a zero
    
    if (!novoCod || !novoNome || isNaN(precoNum)) {
      return mostrarAlerta('Atenção', 'Preencha todos os campos obrigatórios corretamente.', 'aviso');
    }
    
    const { error } = await supabase.from('artigos').insert({ 
      codigo: novoCod, 
      nome: novoNome, 
      preco: precoNum,
      custo_subcontratacao: custoSubNum 
    });
    
    if (error) {
      mostrarAlerta('Erro', error.message, 'erro');
    } else { 
      mostrarAlerta('Sucesso', 'Produto registado!', 'sucesso'); 
      setNovoCod(''); setNovoNome(''); setNovoPreco(''); setNovoCustoSub('');
      carregarDados(); 
      setEcraAtual('catalogo'); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Novo Produto</h2>
      <form onSubmit={registarNovoProduto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={labelStyle}>Código do Artigo (ex: ART-011)</label>
          <input type="text" value={novoCod} onChange={e => setNovoCod(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Nome do Artigo</label>
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Preço de Venda / Faturação (€)</label>
          <input type="number" step="0.01" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Custo de Subcontratação (€) - Opcional</label>
          <input type="number" step="0.01" value={novoCustoSub} onChange={e => setNovoCustoSub(e.target.value)} placeholder="0.00" style={inputStyle} />
        </div>
        <button type="submit" style={btnPrimary}>Guardar Produto</button>
      </form>
    </div>
  );
}