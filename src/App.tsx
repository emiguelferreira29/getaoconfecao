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
export type Artigo = { id: number; codigo: string; nome: string; preco: number; };
export type Saida = { id: number; artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; data: string; op_numero: string; tamanho: string; lote_id: string | null; };
export type ItemExpedicao = { artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; op_numero: string; tamanho: string; };
export type Encomenda = { id: number; op_numero: string; artigo_codigo: string; artigo_nome: string; quantidade_pedida: number; estado: string; data_entrega?: string | null; cliente_final?: string | null; };
export type Ecra = 'home' | 'catalogo' | 'novo_produto' | 'resumo_expedicao' | 'scanner' | 'formulario_saida' | 'relatorio' | 'nova_encomenda' | 'escolher_expedicao' | 'encomendas_pendentes' | 'encomendas_concluidas';

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean>(() => sessionStorage.getItem('autenticadoConfecao') === 'true');
  const [ecraAtual, setEcraAtual] = useState<Ecra>(() => (sessionStorage.getItem('ecraAtualConfecao') as Ecra) || 'home');

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [aCarregar, setACarregar] = useState<boolean>(true);
  
  // Estados Expedição
  const [modoExpedicao, setModoExpedicao] = useState<'livre' | 'op' | null>(null);
  const [opSelecionada, setOpSelecionada] = useState<string>('');
  const [listaExpedicao, setListaExpedicao] = useState<ItemExpedicao[]>([]);

  // ESTADOS MODAIS E REFERÊNCIAS
  const [modalConfirmacao, setModalConfirmacao] = useState<{ aberto: boolean; tipo: TipoModalConfirmacao; idParaApagar: number | string | null }>({ aberto: false, tipo: null, idParaApagar: null });
  const [alerta, setAlerta] = useState<{ visivel: boolean; titulo: string; mensagem: string; tipo: 'sucesso' | 'erro' | 'aviso' }>({ visivel: false, titulo: '', mensagem: '', tipo: 'sucesso' });

  // 1. REFS PARA O BOTÃO "VOLTAR" FÍSICO DO TELEMÓVEL
  const ecraRef = useRef(ecraAtual);
  const listaExpedicaoRef = useRef(listaExpedicao);

  // Manter as referências sempre atualizadas para o evento do telemóvel saber o que está a acontecer
  useEffect(() => {
    ecraRef.current = ecraAtual;
    listaExpedicaoRef.current = listaExpedicao;
  }, [ecraAtual, listaExpedicao]);

  // 2. REGISTAR MUDANÇAS DE ECRÃ NO HISTÓRICO DO BROWSER/TELEMOVEL
  useEffect(() => { 
    sessionStorage.setItem('ecraAtualConfecao', ecraAtual); 
    
    // Se o histórico do sistema não tiver este ecrã registado, adicionamos
    if (!window.history.state || window.history.state.ecra !== ecraAtual) {
      window.history.pushState({ ecra: ecraAtual }, '');
    }
  }, [ecraAtual]);

  // 3. INTERCETAR O CLIQUE FÍSICO DO BOTÃO "VOLTAR"
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const ecraAntesDeVoltar = ecraRef.current;
      
      // TRAVA DE SEGURANÇA: Voltar a meio de uma expedição com peças lidas
      if (ecraAntesDeVoltar === 'resumo_expedicao' && listaExpedicaoRef.current.length > 0) {
        window.history.pushState({ ecra: 'resumo_expedicao' }, ''); // Anula o voltar fisicamente
        setModalConfirmacao({ aberto: true, tipo: 'cancelar_lote', idParaApagar: null }); // Mostra modal
        return;
      }

      // Navegação normal
      if (event.state && event.state.ecra) {
        setEcraAtual(event.state.ecra);
      } else {
        setEcraAtual('home');
      }
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
    
    setACarregar(false);
  }

  const handleLogin = (user: string, pass: string) => {
    if ((user === 'nelaze' && pass === '1988') || (user === 'admin' && pass === 'admin')) {
      setAutenticado(true); 
      sessionStorage.setItem('autenticadoConfecao', 'true');
    } else {
      mostrarAlerta('Acesso Negado', 'Credenciais incorretas.', 'erro');
    }
  };

  const handleLogout = () => setModalConfirmacao({ aberto: true, tipo: 'logout', idParaApagar: null });

  // Botão voltar visual no Header
  const handleVoltar = () => {
    if (ecraAtual === 'resumo_expedicao') { 
      if (listaExpedicao.length > 0) setModalConfirmacao({ aberto: true, tipo: 'cancelar_lote', idParaApagar: null });
      else setEcraAtual('home');
    } 
    else if (ecraAtual === 'scanner' || ecraAtual === 'formulario_saida') { setEcraAtual('resumo_expedicao'); } 
    else { setEcraAtual('home'); }
  };

  // MÉTODOS DE MODAIS E DADOS
  const pedirConfirmacaoApagar = (id: number, tipo: 'saida' | 'artigo') => { setModalConfirmacao({ aberto: true, tipo, idParaApagar: id }); };
  const pedirConfirmacaoApagarLoteInteiro = (lote_id: string) => { setModalConfirmacao({ aberto: true, tipo: 'lote_inteiro', idParaApagar: lote_id }); };
  const pedirConfirmacaoApagarEncomenda = (op_numero: string) => { setModalConfirmacao({ aberto: true, tipo: 'encomenda_inteira', idParaApagar: op_numero }); };
  const cancelarModal = () => setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });

  const executarAcaoModal = async () => {
    const { idParaApagar, tipo } = modalConfirmacao;
    if (!tipo) return;

    if (tipo === 'logout') { 
      setAutenticado(false); 
      sessionStorage.removeItem('autenticadoConfecao'); 
      sessionStorage.removeItem('ecraAtualConfecao');
      setEcraAtual('home'); 
    }
    else if (tipo === 'cancelar_lote') { setListaExpedicao([]); setEcraAtual('home'); }
    else if (tipo === 'saida' && idParaApagar) { await supabase.from('saidas').delete().eq('id', idParaApagar); carregarDados(); }
    else if (tipo === 'artigo' && idParaApagar) { await supabase.from('artigos').delete().eq('id', idParaApagar); carregarDados(); }
    else if (tipo === 'lote_inteiro' && idParaApagar) { const { error } = await supabase.from('saidas').delete().eq('lote_id', idParaApagar as string); if (!error) { carregarDados(); mostrarAlerta('Sucesso', 'A expedição foi eliminada.', 'sucesso'); } }
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
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); } else { resolve(''); }
      };
      img.onerror = () => resolve('');
    });
  };

  const gerarPDF = async (grupo: any, comPrecos: boolean) => {
    const doc = new jsPDF();

    try {
      const logoBase64 = await carregarImagemBase64('/logo.png');
      if (logoBase64) { doc.addImage(logoBase64, 'PNG', 14, 10, 22, 22); }
    } catch (err) { console.warn('Erro ao carregar logótipo no PDF:', err); }

    doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.text(`Nota de Expedição: ${grupo.lote_id}`, 40, 18);
    const dataLote = grupo.data ? new Date(grupo.data) : new Date();
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Data e Hora: ${dataLote.toLocaleString('pt-PT')}`, 40, 25);

    if (comPrecos) { doc.setTextColor(220, 38, 38); doc.text('DOCUMENTO INTERNO - COM VALORES', 40, 31); } 
    else { doc.setTextColor(0); doc.text('DOCUMENTO DE ACOMPANHAMENTO DE MERCADORIA', 40, 31); }

    const colunas = comPrecos 
      ? ['Referência / Artigo', 'Ordem Prod. (OP)', 'Tamanho', 'Qtd', 'Total EUR'] 
      : ['Referência / Artigo', 'Ordem Prod. (OP)', 'Tamanho', 'Qtd'];

    const linhas = grupo.itens.map((i: Saida) => comPrecos 
      ? [`${i.artigo_codigo} - ${i.artigo_nome}`, i.op_numero, i.tamanho || '---', i.quantidade.toString(), `${Number(i.total_faturado).toFixed(2)} €`] 
      : [`${i.artigo_codigo} - ${i.artigo_nome}`, i.op_numero, i.tamanho || '---', i.quantidade.toString()]
    );

    autoTable(doc, { startY: 38, head: [colunas], body: linhas, theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 10, cellPadding: 4 } });

    const totalQtd = grupo.itens.reduce((acc: number, i: Saida) => acc + Number(i.quantidade), 0);
    let finalY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(11); doc.setTextColor(0); doc.text(`Total de Peças Expedidas: ${totalQtd} un.`, 14, finalY);

    if (comPrecos) {
      finalY += 7; doc.setFontSize(12); doc.setTextColor(37, 99, 235); doc.text(`Faturação Total do Lote: ${Number(grupo.total_faturado).toFixed(2)} EUR`, 14, finalY);
    }

    finalY += 15;
    const dataExtenso = dataLote.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Documento emitido a ${dataExtenso}.`, 14, finalY);

    doc.save(`${grupo.lote_id}${comPrecos ? '_INTERNO' : '_CLIENTE'}.pdf`);
  };

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
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      <header style={{ padding: '20px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src="/logo.png" alt="Logótipo" style={{ height: '35px', width: '35px', objectFit: 'contain', borderRadius: '8px' }} /><h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>Confeção</h1></div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {ecraAtual !== 'home' && <button onClick={handleVoltar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>◀ Voltar</button>}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }} title="Terminar Sessão">🚪</button>
        </div>
      </header>

      <main style={{ padding: '20px', paddingBottom: '90px' }}>
        {ecraAtual === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Painel Principal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setEcraAtual('nova_encomenda')} style={{...btnPrimary, padding: '20px', fontSize: '1.1rem', backgroundColor: '#8b5cf6'}}>📥 Registar Entrada</button>
              <button onClick={() => setEcraAtual('escolher_expedicao')} style={{...btnPrimary, padding: '20px', fontSize: '1.1rem'}}>📦 Registar Saída</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setEcraAtual('encomendas_pendentes')} style={{...btnCard, padding: '20px', fontSize: '1rem', backgroundColor: 'var(--surface-color)', border: '2px dashed #eab308', color: '#eab308'}}>📋 Pendentes</button>
              <button onClick={() => setEcraAtual('encomendas_concluidas')} style={{...btnCard, padding: '20px', fontSize: '1rem', backgroundColor: 'var(--surface-color)', border: '2px dashed #22c55e', color: '#22c55e'}}>✅ Concluídas</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={() => setEcraAtual('novo_produto')} style={btnSecondary}>➕ Novo Produto</button>
              <button onClick={() => setEcraAtual('catalogo')} style={btnCard}>📋 Catálogo</button>
              <button onClick={() => setEcraAtual('relatorio')} style={{...btnCard, gridColumn: 'span 2'}}>📊 Histórico Expedições</button>
            </div>
          </div>
        )}

        {/* PÁGINAS MODULARES */}
        {ecraAtual === 'novo_produto' && <NovoProduto setEcraAtual={setEcraAtual} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} />}
        {ecraAtual === 'catalogo' && <Catalogo artigos={artigos} carregarDados={carregarDados} pedirConfirmacaoApagar={pedirConfirmacaoApagar} />}
        {ecraAtual === 'nova_encomenda' && <NovaEncomenda artigos={artigos} setEcraAtual={setEcraAtual} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} />}
        {ecraAtual === 'encomendas_pendentes' && <EncomendasPendentes encomendas={encomendas} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} pedirConfirmacaoApagarEncomenda={pedirConfirmacaoApagarEncomenda} />}
        {ecraAtual === 'encomendas_concluidas' && <EncomendasConcluidas encomendas={encomendas} saidas={saidas} agruparSaidas={agruparSaidas} gerarPDF={gerarPDF} pedirConfirmacaoApagarEncomenda={pedirConfirmacaoApagarEncomenda} />}
        {ecraAtual === 'relatorio' && <Relatorio saidas={saidas} agruparSaidas={agruparSaidas} gerarPDF={gerarPDF} pedirConfirmacaoApagarLoteInteiro={pedirConfirmacaoApagarLoteInteiro} pedirConfirmacaoApagar={pedirConfirmacaoApagar} />}
        
        {['escolher_expedicao', 'resumo_expedicao', 'scanner', 'formulario_saida'].includes(ecraAtual) && (
          <Expedicao ecraAtual={ecraAtual} setEcraAtual={setEcraAtual} artigos={artigos} saidas={saidas} encomendas={encomendas} carregarDados={carregarDados} mostrarAlerta={mostrarAlerta} listaExpedicao={listaExpedicao} setListaExpedicao={setListaExpedicao} modoExpedicao={modoExpedicao} setModoExpedicao={setModoExpedicao} opSelecionada={opSelecionada} setOpSelecionada={setOpSelecionada} />
        )}
      </main>

      <ModalAlerta visivel={alerta.visivel} titulo={alerta.titulo} mensagem={alerta.mensagem} tipo={alerta.tipo} onFechar={fecharAlerta} />
      <ModalConfirmacao aberto={modalConfirmacao.aberto} tipo={modalConfirmacao.tipo} onCancelar={cancelarModal} onConfirmar={executarAcaoModal} />
    </div>
  );
}