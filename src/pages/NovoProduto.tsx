import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { btnPrimary, inputStyle, labelStyle } from '../components/Modais';
import type { Artigo } from '../App';
import jsPDF from 'jspdf';

type Props = {
  artigos: Artigo[];
  setEcraAtual: (ecra: any) => void;
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
};

export default function NovoProduto({ artigos, setEcraAtual, carregarDados, mostrarAlerta }: Props) {
  const [novoCod, setNovoCod] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoCustoSub, setNovoCustoSub] = useState('');

  useEffect(() => {
    let maxNum = 0;
    
    artigos.forEach(a => {
      const parts = a.codigo.match(/\d+/);
      if (parts) {
        const num = parseInt(parts[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    
    const proximoNum = maxNum + 1;
    setNovoCod(`ART-${String(proximoNum).padStart(3, '0')}`);
  }, [artigos]);

  // FUNÇÃO MÁGICA: Gera o QR Code e constrói o PDF!
  const gerarPDFComQR = async (codigo: string, nome: string) => {
    try {
      // Vai buscar a imagem do QR Code de forma automática
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(codigo)}`);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const doc = new jsPDF();
        
        // Desenha a etiqueta no PDF
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235);
        doc.text('Etiqueta de Artigo', 105, 30, { align: 'center' });
        
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text(nome, 105, 50, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(codigo, 105, 60, { align: 'center' });
        
        // Cola o QR Code na folha
        doc.addImage(base64data, 'PNG', 55, 75, 100, 100);
        
        doc.save(`QR_${codigo}.pdf`);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
      mostrarAlerta('Erro', 'Não foi possível gerar o QR Code.', 'erro');
    }
  };

  const registarNovoProduto = async (e: React.FormEvent | React.MouseEvent, gerarQR: boolean = false) => {
    e.preventDefault();
    const precoNum = parseFloat(novoPreco.replace(',', '.'));
    const custoSubNum = parseFloat(novoCustoSub.replace(',', '.')) || 0; 
    
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
      // Se clicou no botão verde, chama a função do PDF!
      if (gerarQR) {
        await gerarPDFComQR(novoCod, novoNome);
      }
      
      mostrarAlerta('Sucesso', 'Produto registado!', 'sucesso'); 
      setNovoNome(''); setNovoPreco(''); setNovoCustoSub('');
      carregarDados(); 
      setEcraAtual('catalogo'); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Novo Produto</h2>
      
      <form onSubmit={(e) => registarNovoProduto(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={labelStyle}>Código do Artigo (Gerado Automaticamente)</label>
          <input type="text" value={novoCod} readOnly style={{ ...inputStyle, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} />
        </div>
        <div>
          <label style={labelStyle}>Nome do Artigo</label>
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} required style={inputStyle} autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Preço de Venda / Faturação (€)</label>
          <input type="number" step="0.01" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Custo de Subcontratação (€) - Opcional</label>
          <input type="number" step="0.01" value={novoCustoSub} onChange={e => setNovoCustoSub(e.target.value)} placeholder="0.00" style={inputStyle} />
        </div>
        
        {/* DOIS BOTÕES: UM NORMAL, OUTRO PARA GRAVAR E GERAR QR */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={(e) => registarNovoProduto(e, false)} style={{...btnPrimary, flex: 1}}>
            Gravar Apenas
          </button>
          
          <button type="button" onClick={(e) => registarNovoProduto(e, true)} style={{...btnPrimary, backgroundColor: '#22c55e', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
            Gravar e Gerar QR
          </button>
        </div>
      </form>
    </div>
  );
}