import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  // Estados para o Relatório PDF
  const [mostrarFiltro, setMostrarFiltro] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const agruparFinanceiroOP = () => {
    const ops: Record<string, { 
      op_numero: string; 
      faturado: number; 
      custo: number; 
      saidas: Saida[]; 
      subs: Subcontrato[]; 
      cliente_final: string | null;
      data_expedicao: string | null; 
    }> = {};
    
    saidas.forEach(s => {
      const op = s.op_numero || 'Avulso';
      if (!ops[op]) ops[op] = { op_numero: op, faturado: 0, custo: 0, saidas: [], subs: [], cliente_final: null, data_expedicao: null };
      ops[op].faturado += Number(s.total_faturado);
      ops[op].saidas.push(s);

      if (!ops[op].data_expedicao || new Date(s.data) > new Date(ops[op].data_expedicao!)) {
        ops[op].data_expedicao = s.data;
      }
    });

    subcontratos.forEach(sub => {
      const op = sub.op_numero;
      if (!ops[op]) ops[op] = { op_numero: op, faturado: 0, custo: 0, saidas: [], subs: [], cliente_final: null, data_expedicao: null };
      ops[op].custo += Number(sub.custo_total);
      ops[op].subs.push(sub);
      
      if (!ops[op].data_expedicao || new Date(sub.data) > new Date(ops[op].data_expedicao!)) {
        ops[op].data_expedicao = sub.data;
      }
    });

    Object.keys(ops).forEach(opNum => {
      const enc = encomendas.find(e => e.op_numero === opNum && e.cliente_final);
      if (enc) {
        ops[opNum].cliente_final = enc.cliente_final || null;
      }
    });

    return Object.values(ops).sort((a, b) => {
      const dataA = a.data_expedicao ? new Date(a.data_expedicao).getTime() : 0;
      const dataB = b.data_expedicao ? new Date(b.data_expedicao).getTime() : 0;
      return dataB - dataA;
    });
  };

  const dados = agruparFinanceiroOP();
  
  const globalFaturado = saidas.reduce((sum, s) => sum + Number(s.total_faturado), 0);
  const globalCustos = subcontratos.reduce((sum, s) => sum + Number(s.custo_total), 0);
  const globalLucro = globalFaturado - globalCustos;

  const abrirDetalhe = (grupo: any) => {
    setOpAtiva(grupo);
    setDetalheVisivel(true);
  };

  // --- LÓGICA DO RELATÓRIO PDF POR DATAS ---
  const carregarImagemBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); } else { resolve(''); }
      };
      img.onerror = () => resolve('');
    });
  };

  const gerarRelatorioPDF = async () => {
    if (!dataInicio || !dataFim) {
      alert("Por favor, selecione a Data de Início e a Data de Fim.");
      return;
    }

    const inicio = new Date(dataInicio); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim); fim.setHours(23, 59, 59, 999);

    // Filtrar saídas pelo intervalo de datas selecionado e ordenar cronologicamente
    const saidasFiltradas = saidas.filter(s => {
      const d = new Date(s.data);
      return d >= inicio && d <= fim;
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    if (saidasFiltradas.length === 0) {
      alert("Não existem expedições/faturação registadas nestas datas.");
      return;
    }

    const doc = new jsPDF();
    try { 
      const logoBase64 = await carregarImagemBase64('/logo.png'); 
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 10, 22, 22); 
    } catch (err) { 
      console.warn('Erro a carregar logo', err); 
    }

    doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.text('Relatório de Faturação e Expedição', 40, 18);
    doc.setFontSize(10); doc.setTextColor(100); 
    doc.text(`Período de Análise: ${inicio.toLocaleDateString('pt-PT')} a ${fim.toLocaleDateString('pt-PT')}`, 40, 25);
    doc.text(`Gerado a: ${new Date().toLocaleString('pt-PT')}`, 40, 31);
    
    const colunas = ['Data', 'OP', 'Artigo / Referência', 'Qtd', 'Faturado'];
    const linhas = saidasFiltradas.map(s => [
      new Date(s.data).toLocaleDateString('pt-PT'),
      s.op_numero || 'Avulso',
      s.artigo_nome,
      s.quantidade.toString(),
      `${Number(s.total_faturado).toFixed(2)} €`
    ]);

    autoTable(doc, { 
      startY: 38, 
      head: [colunas], 
      body: linhas, 
      theme: 'grid', 
      headStyles: { fillColor: [37, 99, 235] }, 
      styles: { fontSize: 9, cellPadding: 4 } 
    });

    const totalFaturadoPeriodo = saidasFiltradas.reduce((acc, s) => acc + Number(s.total_faturado), 0);
    const totalPecasPeriodo = saidasFiltradas.reduce((acc, s) => acc + Number(s.quantidade), 0);
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(11); doc.setTextColor(0); 
    doc.text(`Total de Peças Expedidas no Período: ${totalPecasPeriodo} un.`, 14, finalY);
    
    finalY += 8; 
    doc.setFontSize(14); doc.setTextColor(34, 197, 94); 
    doc.text(`Faturação Total no Período: ${totalFaturadoPeriodo.toFixed(2)} EUR`, 14, finalY);

    doc.save(`Relatorio_Faturacao_${dataInicio}_a_${dataFim}.pdf`);
    setMostrarFiltro(false); // Fecha o painel após gerar
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      
      {/* CABEÇALHO COM BOTÃO DE EXPORTAÇÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Faturação e Custos</h2>
        <button 
          onClick={() => setMostrarFiltro(!mostrarFiltro)} 
          style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📄 Exportar PDF
        </button>
      </div>

      {/* PAINEL DE FILTRO DE DATAS */}
      {mostrarFiltro && (
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #3b82f6', animation: 'fadeIn 0.2s' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#3b82f6' }}>Relatório Interno por Datas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white', colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white', colorScheme: 'dark' }} />
            </div>
          </div>
          <button onClick={gerarRelatorioPDF} style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            📥 Descarregar PDF do Período
          </button>
        </div>
      )}
      
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
                  
                  <div>
                    <strong 
                      onClick={() => abrirDetalhe(grupo)}
                      style={{ fontSize: '1.2rem', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', display: 'block' }}
                      title="Clique para ver os artigos"
                    >
                      {grupo.op_numero}
                    </strong>
                    {grupo.data_expedicao && (
                      <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>
                        📅 {new Date(grupo.data_expedicao).toLocaleDateString('pt-PT')}
                      </small>
                    )}
                  </div>
                  
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