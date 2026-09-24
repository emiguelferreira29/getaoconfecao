import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './index.css';

// COMPONENTES E MODAIS
import Login from './components/Login';
import { ModalAlerta, ModalConfirmacao, btnPrimary, btnSecondary, btnCard } from './components/Modais';
import type { TipoModalConfirmacao } from './components/Modais';

// PÁGINAS IMPORTADAS
import NovoProduto from './pages/NovoProduto';
import Catalogo from './pages/Catalogo';
import NovaEncomenda from './pages/NovaEncomenda';
import EncomendasPendentes from './pages/EncomendasPendentes';
import EncomendasConcluidas from './pages/EncomendasConcluidas';
import Relatorio from './pages/Relatorio';
import Expedicao from './pages/Expedicao';

// --- TIPOS DE DADOS ---
export type Artigo = { id: number; codigo: string; nome: string; preco: number; custo_subcontratacao: number; };
export type Saida = { id: number; artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; data: string; op_numero: string; tamanho: string; lote_id: string | null; };
export type ItemExpedicao = { artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; op_numero: string; tamanho: string; };
export type Encomenda = { id: number; op_numero: string; artigo_codigo: string; artigo_nome: string; quantidade_pedida: number; estado: string; data_entrega?: string | null; cliente_final?: string | null; };
export type Subcontrato = { id: number; op_numero: string; artigo_nome: string; quantidade: number; custo_total: number; subcontratado_a: string; data: string; };
export type Ecra = 'home' | 'catalogo' | 'novo_produto' | 'resumo_expedicao' | 'scanner' | 'formulario_saida' | 'relatorio' | 'nova_encomenda' | 'escolher_expedicao' | 'encomendas_pendentes' | 'encomendas_concluidas';

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean>(() => sessionStorage.getItem('autenticadoConfecao') === 'true');
  const [ecraAtual, setEcraAtual] = useState<Ecra>(() => (sessionStorage.getItem('ecraAtualConfecao') as Ecra) || 'home');

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [subcontratos, setSubcontratos] = useState<Subcontrato[]>([]);
  const [aCarregar, setACarregar] = useState<boolean>(true);
  
  const [modoExpedicao, setModoExpedicao] = useState<'livre' | 'op' | null>(null);
  const [opSelecionada, setOpSelecionada] = useState<string>('');
  const [listaExpedicao, setListaExpedicao] = useState<ItemExpedicao[]>([]);

  const [modalConfirmacao, setModalConfirmacao] = useState<{ aberto: boolean; tipo: TipoModalConfirmacao; idParaApagar: number | string | null }>({ aberto: false, tipo: null, idParaApagar: null });
  const [alerta, setAlerta] = useState<{ visivel: boolean; titulo: string; mensagem: string; tipo: 'sucesso' | 'erro' | 'aviso' }>({ visivel: false, titulo: '', mensagem: '', tipo: 'sucesso' });

  const ecraRef = useRef(ecraAtual);
  const listaExpedicaoRef = useRef(listaExpedicao);

  useEffect(() => {
    ecraRef.current = ecraAtual;
    listaExpedicaoRef.current = listaExpedicao;
  }, [ecraAtual, listaExpedicao]);

  useEffect(() => { 
    sessionStorage.setItem('ecraAtualConfecao', ecraAtual); 
    if (!window.history.state || window.history.state.ecra !== ecraAtual) {
      window.history.pushState({ ecra: ecraAtual }, '');
    }
  }, [ecraAtual]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const ecraAntesDeVoltar = ecraRef.current;
      if (ecraAntesDeVoltar === 'resumo_expedicao' && listaExpedicaoRef.current.length > 0) {
        window.history.pushState({ ecra: 'resumo_expedicao' }, ''); 
        setModalConfirmacao({ aberto: true, tipo: 'cancelar_lote', idParaApagar: null }); 
        return;
      }
      if (event.state && event.state.ecra) { setEcraAtual(event.state.ecra); } 
      else { setEcraAtual('home'); }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const mostrarAlerta = (titulo: string, mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'aviso') => { setAlerta({ visivel: true, titulo, mensagem, tipo }); };
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  useEffect(() => { if (autenticado) carregarDados(); }, [autenticado]);

  async function carregarDados() {
    setACarregar(true);
    const { data: dadosArtigos } = await supabase.from('artigos').select('*').order('codigo');
    if (dadosArtigos) setArtigos(dadosArtigos);
    const { data: dadosSaidas } = await supabase.from('saidas').select('*').order('data', { ascending: false });
    if (dadosSaidas) setSaidas(dadosSaidas);
    const { data: dadosEnc } = await supabase.from('encomendas').select('*');
    if (dadosEnc) setEncomendas(dadosEnc);
    const { data: dadosSub } = await supabase.from('subcontratos').select('*').order('data', { ascending: false });
    if (dadosSub) setSubcontratos(dadosSub);
    setACarregar(false);
  }

  const handleLogin = (user: string, pass: string) => {
    if ((user === 'nelaze' && pass === '1988') || (user === 'admin' && pass === 'admin')) {
      setAutenticado(true); sessionStorage.setItem('autenticadoConfecao', 'true');
    } else { mostrarAlerta('Acesso Negado', 'Credenciais incorretas.', 'erro'); }
  };

  const handleLogout = () => setModalConfirmacao({ aberto: true, tipo: 'logout', idParaApagar: null });

  const handleVoltar = () => {
    if (ecraAtual === 'resumo_expedicao') { 
      if (listaExpedicao.length > 0) setModalConfirmacao({ aberto: true, tipo: 'cancelar_lote', idParaApagar: null });
      else setEcraAtual('home');
    } 
    else if (ecraAtual === 'scanner' || ecraAtual === 'formulario_saida') { setEcraAtual('resumo_expedicao'); } 
    else { setEcraAtual('home'); }
  };

  const iniciarExpedicaoDePendente = (op_numero: string) => {
    setOpSelecionada(op_numero); setModoExpedicao('op'); setListaExpedicao([]); setEcraAtual('resumo_expedicao');
  };

  const pedirConfirmacaoApagar = (id: number, tipo: 'saida' | 'artigo') => { setModalConfirmacao({ aberto: true, tipo, idParaApagar: id }); };
  const pedirConfirmacaoApagarEncomenda = (op_numero: string) => { setModalConfirmacao({ aberto: true, tipo: 'encomenda_inteira', idParaApagar: op_numero }); };
  const cancelarModal = () => setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });

  const executarAcaoModal = async () => {
    const { idParaApagar, tipo } = modalConfirmacao;
    if (!tipo) return;
    if (tipo === 'logout') { setAutenticado(false); sessionStorage.removeItem('autenticadoConfecao'); sessionStorage.removeItem('ecraAtualConfecao'); setEcraAtual('home'); }
    else if (tipo === 'cancelar_lote') { setListaExpedicao([]); setEcraAtual('home'); }
    else if (tipo === 'saida' && idParaApagar) { await supabase.from('saidas').delete().eq('id', idParaApagar); carregarDados(); }
    else if (tipo === 'artigo' && idParaApagar) { await supabase.from('artigos').delete().eq('id', idParaApagar); carregarDados(); }
    else if (tipo === 'encomenda_inteira' && idParaApagar) { const { error } = await supabase.from('encomendas').delete().eq('op_numero', idParaApagar as string); if (!error) { carregarDados(); mostrarAlerta('Sucesso', 'A Ordem de Produção foi apagada!', 'sucesso'); } else mostrarAlerta('Erro', error.message, 'erro'); }
    setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });
  };

  const agruparSaidas = () => {
    const grupos = saidas.reduce((acc, saida) => {
      const chave = saida.lote_id || `avulso-${saida.id}`; 
      if (!acc[chave]) acc[chave] = { lote_id: chave, data: saida.data, total_faturado: 0, itens: [] };
      acc[chave].total_faturado += Number(saida.total_faturado); acc[chave].itens.push(saida); return acc;
    }, {} as Record<string, { lote_id: string; data: string; total_faturado: number; itens: Saida[] }>);
    return Object.values(grupos).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  };

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

  const gerarPDF = async (grupo: any, comPrecos: boolean) => {
    const doc = new jsPDF();
    try { const logoBase64 = await carregarImagemBase64('/logo.png'); if (logoBase64) { doc.addImage(logoBase64, 'PNG', 14, 10, 22, 22); } } catch (err) { console.warn('Erro ao carregar logótipo no PDF:', err); }
    doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.text(`Nota de Expedição: ${grupo.lote_id}`, 40, 18);
    const dataLote = grupo.data ? new Date(grupo.data) : new Date();
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Data e Hora: ${dataLote.toLocaleString('pt-PT')}`, 40, 25);
    if (comPrecos) { doc.setTextColor(220, 38, 38); doc.text('DOCUMENTO INTERNO - COM VALORES', 40, 31); } 
    else { doc.setTextColor(0); doc.text('DOCUMENTO DE ACOMPANHAMENTO DE MERCADORIA', 40, 31); }
    const colunas = comPrecos ? ['Referência / Artigo', 'Ordem Prod. (OP)', 'Tamanho', 'Qtd', 'Total EUR'] : ['Referência / Artigo', 'Ordem Prod. (OP)', 'Tamanho', 'Qtd'];
    const linhas = grupo.itens.map((i: Saida) => comPrecos ? [`${i.artigo_codigo} - ${i.artigo_nome}`, i.op_numero, i.tamanho || '---', i.quantidade.toString(), `${Number(i.total_faturado).toFixed(2)} €`] : [`${i.artigo_codigo} - ${i.artigo_nome}`, i.op_numero, i.tamanho || '---', i.quantidade.toString()]);
    autoTable(doc, { startY: 38, head: [colunas], body: linhas, theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 10, cellPadding: 4 } });
    const totalQtd = grupo.itens.reduce((acc: number, i: Saida) => acc + Number(i.quantidade), 0); let finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11); doc.setTextColor(0); doc.text(`Total de Peças Expedidas: ${totalQtd} un.`, 14, finalY);
    if (comPrecos) { finalY += 7; doc.setFontSize(12); doc.setTextColor(37, 99, 235); doc.text(`Faturação Total do Lote: ${Number(grupo.total_faturado).toFixed(2)} EUR`, 14, finalY); }
    finalY += 15; const dataExtenso = dataLote.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Documento emitido a ${dataExtenso}.`, 14, finalY);
    doc.save(`${grupo.lote_id}${comPrecos ? '_INTERNO' : '_CLIENTE'}.pdf`);
  };

  const navItemStyle = (isActive: boolean) => ({
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px',
    color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
    background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer', flex: 1,
    transition: 'color 0.2s ease'
  });

  if (!autenticado) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ModalAlerta visivel={alerta.visivel} titulo={alerta.titulo} mensagem={alerta.mensagem} tipo={alerta.tipo} onFechar={fecharAlerta} />
      </>
    );
  }

  if (aCarregar) return <div className="loading">A sincronizar com a base de dados...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative', paddingBottom: '90px' }}>
      
      <header style={{ padding: '15px 20px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logótipo" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '8px' }} />
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)', fontWeight: '600' }}>M&J Tailors - Confeção</h1>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {ecraAtual !== 'home' && (
            <button onClick={handleVoltar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Voltar
            </button>
          )}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '500' }} title="Terminar Sessão">
            Sair
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      <main style={{ padding: '20px' }}>
        {ecraAtual === 'home' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '1.6rem', margin: '0 0 4px 0', fontWeight: '700' }}>Painel de Gestão</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Controlo de Produção e Logística</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '35px' }}>
              <button onClick={() => setEcraAtual('nova_encomenda')} style={{ ...btnPrimary, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', backgroundColor: '#8b5cf6', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)', border: 'none', color: 'white', cursor: 'pointer' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </div>
                <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>Registar Entrada</span>
              </button>
              
              <button onClick={() => setEcraAtual('escolher_expedicao')} style={{ ...btnPrimary, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', backgroundColor: '#3b82f6', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)', border: 'none', color: 'white', cursor: 'pointer' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>Registar Saída</span>
              </button>
            </div>

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Painel de Controlo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={() => setEcraAtual('encomendas_pendentes')} style={{ ...btnCard, padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                <span style={{ fontSize: '1.2rem' }}>📋</span>
                <span style={{ fontWeight: '500' }}>Pendentes</span>
              </button>
              
              <button onClick={() => setEcraAtual('encomendas_concluidas')} style={{ ...btnCard, padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <span style={{ fontWeight: '500' }}>Concluídas</span>
              </button>
              
              <button onClick={() => setEcraAtual('catalogo')} style={{ ...btnCard, padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>🏷️</span>
                <span style={{ fontWeight: '500' }}>Catálogo</span>
              </button>

              <button onClick={() => setEcraAtual('relatorio')} style={{ ...btnCard, padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>💰</span>
                <span style={{ fontWeight: '500' }}>Faturação</span>
              </button>
              
              <button onClick={() => setEcraAtual('novo_produto')} style={{ ...btnSecondary, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', gridColumn: 'span 2', borderStyle: 'dashed' }}>
                <span style={{ fontSize: '1.2rem' }}>➕</span>
                <span style={{ fontWeight: '500' }}>Novo Produto</span>
              </button>
            </div>
          </div>
        )}

        {/* PÁGINAS MODULARES */}
        {ecraAtual === 'novo_produto' && <NovoProduto setEcraAtual={setEcraAtual} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} />}
        {ecraAtual === 'catalogo' && <Catalogo artigos={artigos} carregarDados={carregarDados} pedirConfirmacaoApagar={pedirConfirmacaoApagar} />}
        {ecraAtual === 'nova_encomenda' && <NovaEncomenda artigos={artigos} setEcraAtual={setEcraAtual} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} />}
        {ecraAtual === 'encomendas_pendentes' && <EncomendasPendentes artigos={artigos} encomendas={encomendas} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} pedirConfirmacaoApagarEncomenda={pedirConfirmacaoApagarEncomenda} iniciarExpedicaoDePendente={iniciarExpedicaoDePendente} />}
        {ecraAtual === 'encomendas_concluidas' && <EncomendasConcluidas encomendas={encomendas} saidas={saidas} agruparSaidas={agruparSaidas} gerarPDF={gerarPDF} pedirConfirmacaoApagarEncomenda={pedirConfirmacaoApagarEncomenda} />}
        {ecraAtual === 'relatorio' && <Relatorio saidas={saidas} subcontratos={subcontratos} />}
        
        {['escolher_expedicao', 'resumo_expedicao', 'scanner', 'formulario_saida'].includes(ecraAtual) && (
          <Expedicao ecraAtual={ecraAtual} setEcraAtual={setEcraAtual} artigos={artigos} saidas={saidas} encomendas={encomendas} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} listaExpedicao={listaExpedicao} setListaExpedicao={setListaExpedicao} modoExpedicao={modoExpedicao} setModoExpedicao={setModoExpedicao} opSelecionada={opSelecionada} setOpSelecionada={setOpSelecionada} />
        )}
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '600px', backgroundColor: 'var(--surface-color)',
        borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-around',
        padding: '12px 0', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', zIndex: 100,
        boxShadow: '0 -10px 20px rgba(0,0,0,0.3)'
      }}>
        <button onClick={() => setEcraAtual('home')} style={navItemStyle(ecraAtual === 'home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ecraAtual === 'home' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Início
        </button>
        <button onClick={() => setEcraAtual('encomendas_pendentes')} style={navItemStyle(ecraAtual === 'encomendas_pendentes')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ecraAtual === 'encomendas_pendentes' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Pendentes
        </button>
        <button onClick={() => setEcraAtual('escolher_expedicao')} style={navItemStyle(['escolher_expedicao', 'resumo_expedicao', 'scanner', 'formulario_saida'].includes(ecraAtual))}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={['escolher_expedicao', 'resumo_expedicao', 'scanner', 'formulario_saida'].includes(ecraAtual) ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Expedir
        </button>
        <button onClick={() => setEcraAtual('relatorio')} style={navItemStyle(ecraAtual === 'relatorio')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ecraAtual === 'relatorio' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Faturação
        </button>
      </nav>

      <ModalAlerta visivel={alerta.visivel} titulo={alerta.titulo} mensagem={alerta.mensagem} tipo={alerta.tipo} onFechar={fecharAlerta} />
      <ModalConfirmacao aberto={modalConfirmacao.aberto} tipo={modalConfirmacao.tipo} onCancelar={cancelarModal} onConfirmar={executarAcaoModal} />
    </div>
  );
}