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
  
  // Novo estado para mostrar ao utilizador que o PDF geral está a ser gerado
  const [gerandoTodosPDF, setGerandoTodosPDF] = useState(false);

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

  // FUNÇÃO 1: Imprimir apenas 1 QR Code (Etiqueta Grande)
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

  // FUNÇÃO 2: Imprimir TODOS os QR Codes numa grelha (A4)
  const gerarPDFTodosQRs = async () => {
    if (artigos.length === 0) return;
    setGerandoTodosPDF(true);
    
    try {
      const doc = new jsPDF();
      const colunas = 3;
      const linhas = 5;
      const itensPorPagina = colunas * linhas; // 15 etiquetas por página
      
      const margemX = 10;
      const margemY = 10;
      const larguraPagina = 210; // Folha A4
      const alturaPagina = 297; // Folha A4
      
      const larguraCelula = (larguraPagina - 2 * margemX) / colunas; 
      const alturaCelula = (alturaPagina - 2 * margemY) / linhas; 
      const qrSize = 35; // Tamanho do QR Code em mm

      // Percorre todos os artigos do catálogo sequencialmente
      for (let i = 0; i < artigos.length; i++) {
        const artigo = artigos[i];
        
        // Vai buscar o QR Code
        const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(artigo.codigo)}`);
        const blob = await response.blob();
        const base64data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const indexNaPagina = i % itensPorPagina;
        
        // Adiciona uma nova folha se passar das 15 etiquetas
        if (indexNaPagina === 0 && i !== 0) {
          doc.addPage();
        }

        const col = indexNaPagina % colunas;
        const row = Math.floor(indexNaPagina / colunas);

        // Calcula a posição (X, Y) exata da célula atual na grelha
        const x = margemX + col * larguraCelula;
        const y = margemY + row * alturaCelula;

        // Desenhar a linha de corte (Tracejado suave)
        doc.setDrawColor(200);
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(x, y, larguraCelula, alturaCelula);
        doc.setLineDashPattern([], 0); // Limpar o estilo tracejado para o resto

        // Desenhar a Imagem do QR Code centrada na célula
        const qrX = x + (larguraCelula - qrSize) / 2;
        const qrY = y + 8;
        doc.addImage(base64data, 'PNG', qrX, qrY, qrSize, qrSize);

        // Escrever o Nome do Artigo (Cortar o nome se for demasiado comprido)
        doc.setFontSize(10);
        doc.setTextColor(0);
        let nomeLimpo = artigo.nome;
        if (nomeLimpo.length > 22) nomeLimpo = nomeLimpo.substring(0, 20) + '...';
        doc.text(nomeLimpo, x + larguraCelula / 2, qrY + qrSize + 7, { align: 'center' });
        
        // Escrever o Código do Artigo
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(artigo.codigo, x + larguraCelula / 2, qrY + qrSize + 12, { align: 'center' });
      }

      doc.save('Grelha_Etiquetas_M&J_Tailors.pdf');
    } catch (err) {
      console.error('Erro ao gerar grelha de QR Codes:', err);
      alert('Ocorreu um erro a gerar o PDF.');
    } finally {
      setGerandoTodosPDF(false); // Retira o estado de "A carregar"
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      
      {/* CABEÇALHO DO CATÁLOGO COM O NOVO BOTÃO DE GRELHA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Catálogo ({artigos.length})</h2>
        <button 
          onClick={gerarPDFTodosQRs}
          disabled={gerandoTodosPDF}
          style={{ 
            backgroundColor: 'var(--surface-color)', border: '1px solid #3b82f6', color: '#3b82f6', 
            padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem',
            cursor: gerandoTodosPDF ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            opacity: gerandoTodosPDF ? 0.6 : 1
          }}
        >
          {gerandoTodosPDF ? '⏳ A gerar PDF...' : '🖨️ Imprimir Todas Etiquetas'}
        </button>
      </div>

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
                    <button onClick={() => gerarPDFComQR(artigo.codigo, artigo.nome)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }} title="Imprimir Etiqueta Única">🖨️</button>
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