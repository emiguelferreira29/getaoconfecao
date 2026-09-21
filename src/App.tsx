import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './index.css';

// --- TIPOS DE DADOS ---
type Artigo = { id: number; codigo: string; nome: string; preco: number; };
type Saida = { id: number; artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; data: string; op_numero: string; tamanho: string; lote_id: string | null; };
type ItemExpedicao = { artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; op_numero: string; tamanho: string; };
type Encomenda = { id: number; op_numero: string; artigo_codigo: string; artigo_nome: string; quantidade_pedida: number; estado: string; data_entrega?: string | null; };
type ItemNovaOp = { artigo: Artigo; quantidade: number; };
type Ecra = 'home' | 'catalogo' | 'novo_produto' | 'resumo_expedicao' | 'scanner' | 'formulario_saida' | 'relatorio' | 'nova_encomenda' | 'escolher_expedicao' | 'encomendas_pendentes' | 'encomendas_concluidas';

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean>(() => localStorage.getItem('autenticadoConfecao') === 'true');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [ecraAtual, setEcraAtual] = useState<Ecra>(() => (localStorage.getItem('ecraAtualConfecao') as Ecra) || 'home');

  useEffect(() => { localStorage.setItem('ecraAtualConfecao', ecraAtual); }, [ecraAtual]);

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [aCarregar, setACarregar] = useState<boolean>(true);
  
  // Estados para Expedição
  const [modoExpedicao, setModoExpedicao] = useState<'livre' | 'op' | null>(null);
  const [opSelecionada, setOpSelecionada] = useState<string>('');
  const [listaExpedicao, setListaExpedicao] = useState<ItemExpedicao[]>([]);
  
  // Estados para nova OP (Entrada)
  const [novaOpNumero, setNovaOpNumero] = useState('');
  const [novaOpDataEntrega, setNovaOpDataEntrega] = useState('');
  const [novaOpLista, setNovaOpLista] = useState<ItemNovaOp[]>([]);
  const [novaOpArtigo, setNovaOpArtigo] = useState<Artigo | null>(null);
  const [novaOpQtd, setNovaOpQtd] = useState('');

  // Estados para Edição de OP Pendente
  const [editandoOpId, setEditandoOpId] = useState<string | null>(null);
  const [editOpData, setEditOpData] = useState<string>('');
  const [editOpQuantidades, setEditOpQuantidades] = useState<Record<number, number>>({});

  // Estados para Formulario Saida
  const [modoSaida, setModoSaida] = useState<'scanner' | 'manual' | null>(null);
  const [artigoSelecionado, setArtigoSelecionado] = useState<Artigo | null>(null);
  const [pausarCamara, setPausarCamara] = useState<boolean>(false);
  const [formOP, setFormOP] = useState('');
  const [formTamanho, setFormTamanho] = useState('');
  const [formQtd, setFormQtd] = useState('');
  
  // Estados Catalogo
  const [novoCod, setNovoCod] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [editandoPrecoId, setEditandoPrecoId] = useState<number | null>(null);
  const [precoEditado, setPrecoEditado] = useState<string>('');

  const [modalConfirmacao, setModalConfirmacao] = useState<{ aberto: boolean; tipo: 'saida' | 'artigo' | 'logout' | 'cancelar_lote' | 'lote_inteiro' | null; idParaApagar: number | string | null }>({ aberto: false, tipo: null, idParaApagar: null });
  const [alerta, setAlerta] = useState<{ visivel: boolean; titulo: string; mensagem: string; tipo: 'sucesso' | 'erro' | 'aviso' }>({ visivel: false, titulo: '', mensagem: '', tipo: 'sucesso' });

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if ((loginUser === 'nelaze' && loginPass === '1988') || (loginUser === 'admin' && loginPass === 'admin')) {
      setAutenticado(true); localStorage.setItem('autenticadoConfecao', 'true'); setLoginUser(''); setLoginPass('');
    } else mostrarAlerta('Acesso Negado', 'Credenciais incorretas.', 'erro');
  };

  const handleLogout = () => setModalConfirmacao({ aberto: true, tipo: 'logout', idParaApagar: null });

  const handleVoltar = () => {
    if (ecraAtual === 'resumo_expedicao') {
      pedirConfirmacaoCancelarLote();
    } else if (ecraAtual === 'scanner' || ecraAtual === 'formulario_saida') {
      setEcraAtual('resumo_expedicao');
    } else {
      setEcraAtual('home');
    }
  };

  // --- REGISTAR NOVA ENCOMENDA (ENTRADA) ---
  const adicionarItemNovaOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOpArtigo) return mostrarAlerta('Atenção', 'Selecione um artigo.', 'aviso');
    const qtd = parseInt(novaOpQtd);
    if (isNaN(qtd) || qtd <= 0) return mostrarAlerta('Atenção', 'Quantidade inválida.', 'aviso');
    setNovaOpLista([...novaOpLista, { artigo: novaOpArtigo, quantidade: qtd }]);
    setNovaOpArtigo(null); setNovaOpQtd('');
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
    if (error) mostrarAlerta('Erro', error.message, 'erro');
    else {
      mostrarAlerta('Sucesso', `A ${novaOpNumero} foi registada com sucesso!`, 'sucesso');
      setNovaOpNumero(''); setNovaOpDataEntrega(''); setNovaOpLista([]); carregarDados(); setEcraAtual('home');
    }
  };

  // --- EDIÇÃO DE OP PENDENTE ---
  const iniciarEdicaoOp = (grupo: any) => {
    setEditandoOpId(grupo.op_numero);
    setEditOpData(grupo.data_entrega || '');
    const qtds: Record<number, number> = {};
    grupo.itens.forEach((item: Encomenda) => {
      qtds[item.id] = item.quantidade_pedida;
    });
    setEditOpQuantidades(qtds);
  };

  const guardarEdicaoOp = async (op_numero: string) => {
    try {
      const itensParaAtualizar = Object.keys(editOpQuantidades);
      for (const idStr of itensParaAtualizar) {
        const id = parseInt(idStr);
        const qtd = editOpQuantidades[id];
        const { error } = await supabase
          .from('encomendas')
          .update({
            quantidade_pedida: qtd,
            data_entrega: editOpData ? editOpData : null
          })
          .eq('id', id);
        
        if (error) throw error;
      }
      mostrarAlerta('Sucesso', `A ${op_numero} foi atualizada!`, 'sucesso');
      setEditandoOpId(null);
      carregarDados();
    } catch (err: any) {
      mostrarAlerta('Erro ao atualizar', err.message, 'erro');
    }
  };

  // --- LÓGICA DE CATÁLOGO ---
  const registarNovoProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(novoPreco.replace(',', '.'));
    if (!novoCod || !novoNome || isNaN(precoNum)) return mostrarAlerta('Atenção', 'Preencha todos os campos corretamente.', 'aviso');
    const { error } = await supabase.from('artigos').insert({ codigo: novoCod, nome: novoNome, preco: precoNum });
    if (error) mostrarAlerta('Erro', error.message, 'erro'); else { mostrarAlerta('Sucesso', 'Produto registado!', 'sucesso'); setNovoCod(''); setNovoNome(''); setNovoPreco(''); carregarDados(); setEcraAtual('catalogo'); }
  };

  const guardarNovoPreco = async (id: number) => {
    const precoNum = parseFloat(precoEditado.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) return;
    const { error } = await supabase.from('artigos').update({ preco: precoNum }).eq('id', id);
    if (!error) { setEditandoPrecoId(null); carregarDados(); }
  };

  // --- LÓGICA DE EXPEDIÇÃO ---
  const iniciarExpedicaoLivre = () => {
    setModoExpedicao('livre'); setOpSelecionada(''); setListaExpedicao([]); setFormOP(''); setEcraAtual('resumo_expedicao');
  };

  const iniciarExpedicaoOP = () => {
    if (!opSelecionada) return mostrarAlerta('Atenção', 'Selecione uma OP pendente.', 'aviso');
    setModoExpedicao('op'); setListaExpedicao([]); setFormOP(opSelecionada); setEcraAtual('resumo_expedicao');
  };

  const processarLeituraScanner = (codigosLidos: any[]) => {
    if (codigosLidos.length === 0 || pausarCamara) return;
    const codigoQR = codigosLidos[0].rawValue;
    setPausarCamara(true);
    const artigo = artigos.find(a => a.codigo === codigoQR);
    if (artigo) {
      setArtigoSelecionado(artigo); setEcraAtual('formulario_saida');
    } else {
      mostrarAlerta('Artigo não encontrado', `Código "${codigoQR}" não existe.`, 'aviso');
      setTimeout(() => setPausarCamara(false), 2000);
    }
  };

  const adicionarAoLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artigoSelecionado) return;
    const qtdNum = parseInt(formQtd);
    if (isNaN(qtdNum) || qtdNum <= 0) return;
    
    const opAUsar = modoExpedicao === 'op' ? opSelecionada : formOP;
    const novoItem: ItemExpedicao = {
      artigo_codigo: artigoSelecionado.codigo, artigo_nome: artigoSelecionado.nome,
      quantidade: qtdNum, total_faturado: qtdNum * artigoSelecionado.preco,
      op_numero: opAUsar, tamanho: formTamanho
    };
    setListaExpedicao([...listaExpedicao, novoItem]);
    setFormQtd(''); setArtigoSelecionado(null); setEcraAtual('resumo_expedicao');
  };

  const removerDoLoteTemporario = (index: number) => {
    const novaLista = [...listaExpedicao]; novaLista.splice(index, 1); setListaExpedicao(novaLista);
  };

  const finalizarExpedicao = async () => {
    if (listaExpedicao.length === 0) return;

    const hoje = new Date();
    const dia = hoje.getDate().toString().padStart(2, '0');
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `Expedição ${dia}${mes}${hoje.getFullYear()}-`;

    const lotesDeHoje = saidas.map(s => s.lote_id).filter(id => id && id.startsWith(prefixo)) as string[];
    let maxNum = 0;
    Array.from(new Set(lotesDeHoje)).forEach(lote => {
      const num = parseInt(lote.split('-')[1]);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const novoLoteId = `${prefixo}${maxNum + 1}`;
    const dadosParaInserir = listaExpedicao.map(item => ({ ...item, lote_id: novoLoteId }));
    const { error } = await supabase.from('saidas').insert(dadosParaInserir);

    if (error) return mostrarAlerta('Erro', error.message, 'erro');

    if (modoExpedicao === 'op' && opSelecionada) {
      const itensDaOp = encomendas.filter(e => e.op_numero === opSelecionada);
      for (const enc of itensDaOp) {
        const qtdEnviada = listaExpedicao.filter(l => l.artigo_codigo === enc.artigo_codigo).reduce((sum, curr) => sum + curr.quantidade, 0);
        if (qtdEnviada > 0) {
          const novaQtd = enc.quantidade_pedida - qtdEnviada;
          if (novaQtd <= 0) await supabase.from('encomendas').update({ estado: 'concluida', quantidade_pedida: 0 }).eq('id', enc.id);
          else await supabase.from('encomendas').update({ quantidade_pedida: novaQtd }).eq('id', enc.id);
        }
      }
    }

    mostrarAlerta('Expedição Concluída', `O lote "${novoLoteId}" foi registado com sucesso!`, 'sucesso');
    setListaExpedicao([]); setFormOP(''); setFormTamanho('');
    carregarDados(); setEcraAtual('home');
  };

  // --- MÉTODOS DE RELATÓRIO E MODAIS ---
  const pedirConfirmacaoApagar = (id: number, tipo: 'saida' | 'artigo') => { setModalConfirmacao({ aberto: true, tipo, idParaApagar: id }); };
  const pedirConfirmacaoApagarLoteInteiro = (lote_id: string) => { setModalConfirmacao({ aberto: true, tipo: 'lote_inteiro', idParaApagar: lote_id }); };
  const pedirConfirmacaoCancelarLote = () => {
    if (listaExpedicao.length > 0) setModalConfirmacao({ aberto: true, tipo: 'cancelar_lote', idParaApagar: null }); else setEcraAtual('home');
  };
  const cancelarModal = () => setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });

  const executarAcaoModal = async () => {
    const { idParaApagar, tipo } = modalConfirmacao;
    if (!tipo) return;
    if (tipo === 'logout') { setAutenticado(false); localStorage.removeItem('autenticadoConfecao'); setEcraAtual('home'); }
    else if (tipo === 'cancelar_lote') { setListaExpedicao([]); setEcraAtual('home'); }
    else if (tipo === 'saida' && idParaApagar) { await supabase.from('saidas').delete().eq('id', idParaApagar); carregarDados(); }
    else if (tipo === 'artigo' && idParaApagar) { await supabase.from('artigos').delete().eq('id', idParaApagar); carregarDados(); }
    else if (tipo === 'lote_inteiro' && idParaApagar) {
      const { error } = await supabase.from('saidas').delete().eq('lote_id', idParaApagar as string);
      if (!error) { carregarDados(); mostrarAlerta('Sucesso', 'A expedição foi eliminada.', 'sucesso'); }
    }
    setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });
  };

  const agruparSaidas = () => {
    const grupos = saidas.reduce((acc, saida) => {
      const chave = saida.lote_id || `avulso-${saida.id}`; 
      if (!acc[chave]) acc[chave] = { lote_id: chave, data: saida.data, total_faturado: 0, itens: [] };
      acc[chave].total_faturado += Number(saida.total_faturado); acc[chave].itens.push(saida);
      return acc;
    }, {} as Record<string, { lote_id: string; data: string; total_faturado: number; itens: Saida[] }>);
    return Object.values(grupos).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  };

  const obterOportunidadesPendentes = () => {
    const ops = encomendas.filter(e => e.estado === 'pendente').map(e => e.op_numero);
    return Array.from(new Set(ops));
  };

  const agruparEncomendasPendentes = () => {
    const grupos: Record<string, { op_numero: string; data_entrega: string | null; itens: Encomenda[] }> = {};
    encomendas.filter(e => e.estado === 'pendente').forEach(enc => {
      if (!grupos[enc.op_numero]) grupos[enc.op_numero] = { op_numero: enc.op_numero, data_entrega: enc.data_entrega || null, itens: [] };
      grupos[enc.op_numero].itens.push(enc);
    });
    
    return Object.values(grupos).sort((a, b) => {
      const dataA = a.data_entrega ? new Date(a.data_entrega).getTime() : Infinity;
      const dataB = b.data_entrega ? new Date(b.data_entrega).getTime() : Infinity;
      return dataA - dataB;
    });
  };

  const agruparEncomendasConcluidas = () => {
    const grupos: Record<string, { op_numero: string; itens: Encomenda[] }> = {};
    encomendas.filter(e => e.estado === 'concluida').forEach(enc => {
      if (!grupos[enc.op_numero]) grupos[enc.op_numero] = { op_numero: enc.op_numero, itens: [] };
      grupos[enc.op_numero].itens.push(enc);
    });
    return Object.values(grupos);
  };

  const obterLotesDaOP = (op_numero: string) => {
    const lotes = saidas.filter(s => s.op_numero === op_numero && s.lote_id).map(s => s.lote_id as string);
    return Array.from(new Set(lotes));
  };

  const calcularStatusData = (dataStr: string | null) => {
    if (!dataStr) return { corBorda: 'var(--border-color)', icone: '📅', texto: 'Sem prazo definido' };
    
    const dataEntrega = new Date(dataStr);
    const hoje = new Date();
    dataEntrega.setHours(0,0,0,0); hoje.setHours(0,0,0,0);
    
    const diffTime = dataEntrega.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { corBorda: '#ef4444', icone: '🔴', texto: `Atrasada (${Math.abs(diffDays)} dias)` };
    if (diffDays <= 5) return { corBorda: '#eab308', icone: '🟡', texto: `Atenção: Falta(m) ${diffDays} dia(s)` };
    return { corBorda: '#22c55e', icone: '🟢', texto: `No prazo (${new Date(dataStr).toLocaleDateString('pt-PT')})` };
  };

  // --- GERAÇÃO DE PDF ---
  const gerarPDF = (grupo: any, comPrecos: boolean) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(37, 99, 235); doc.text(`Nota de Expedicao: ${grupo.lote_id}`, 14, 20);
    doc.setFontSize(11); doc.setTextColor(100); doc.text(`Data e Hora: ${new Date(grupo.data).toLocaleString('pt-PT')}`, 14, 28);
    if (comPrecos) { doc.setTextColor(220, 38, 38); doc.text('DOCUMENTO INTERNO - COM VALORES', 14, 34); } 
    else { doc.setTextColor(0); doc.text('DOCUMENTO DE ACOMPANHAMENTO DE MERCADORIA', 14, 34); }

    const colunas = comPrecos ? ['Referencia / Artigo', 'Ordem Prod. (OP)', 'Tamanho', 'Qtd', 'Total EUR'] : ['Referencia / Artigo', 'Ordem Prod. (OP)', 'Tamanho', 'Qtd'];
    const linhas = grupo.itens.map((i: Saida) => comPrecos 
      ? [`${i.artigo_codigo} - ${i.artigo_nome}`, i.op_numero, i.tamanho, i.quantidade.toString(), `${Number(i.total_faturado).toFixed(2)}`] 
      : [`${i.artigo_codigo} - ${i.artigo_nome}`, i.op_numero, i.tamanho, i.quantidade.toString()]
    );
    autoTable(doc, { startY: 40, head: [colunas], body: linhas, theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 10, cellPadding: 4 } });

    const totalQtd = grupo.itens.reduce((acc: number, i: Saida) => acc + i.quantidade, 0);
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(12); doc.setTextColor(0); doc.text(`Total de Pecas Expedidas: ${totalQtd} un.`, 14, finalY);
    if (comPrecos) { doc.setFontSize(14); doc.setTextColor(37, 99, 235); doc.text(`Faturacao Total do Lote: ${grupo.total_faturado.toFixed(2)} EUR`, 14, finalY + 10); }

    doc.save(`${grupo.lote_id}${comPrecos ? '_INTERNO' : '_CLIENTE'}.pdf`);
  };

  // --- INTERFACE (UI) ---
  if (!autenticado) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', backgroundColor: 'var(--bg-color)', animation: 'fadeIn 0.5s' }}>
        <img src="/logo.png" alt="Logótipo" style={{ width: '130px', height: '130px', objectFit: 'contain', borderRadius: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '30px' }}>Bem-vindo</h2>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div><label style={labelStyle}>Utilizador</label><input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} required style={inputStyle} /></div>
          <div><label style={labelStyle}>Palavra-passe</label><input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} /></div>
          <button type="submit" style={{ ...btnPrimary, marginTop: '10px' }}>Entrar</button>
        </form>
      </div>
    );
  }

  if (aCarregar) return <div className="loading">A sincronizar com a base de dados...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      
      <header style={{ padding: '20px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Logótipo" style={{ height: '35px', width: '35px', objectFit: 'contain', borderRadius: '8px' }} />
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>Confeção</h1>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {ecraAtual !== 'home' && (
            <button onClick={handleVoltar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>◀ Voltar</button>
          )}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }} title="Terminar Sessão">🚪</button>
        </div>
      </header>

      <main style={{ padding: '20px', paddingBottom: '90px' }}>
        
        {/* PÁGINA INICIAL */}
        {ecraAtual === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Painel Principal</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setEcraAtual('nova_encomenda')} style={{...btnPrimary, padding: '20px', fontSize: '1.1rem', backgroundColor: '#8b5cf6'}}>📥 Registar Entrada</button>
              <button onClick={() => setEcraAtual('escolher_expedicao')} style={{...btnPrimary, padding: '20px', fontSize: '1.1rem'}}>📦 Registar Saída</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setEcraAtual('encomendas_pendentes')} style={{...btnCard, padding: '20px', fontSize: '1rem', backgroundColor: 'var(--surface-color)', border: '2px dashed #eab308', color: '#eab308'}}>
                📋 Pendentes
              </button>
              <button onClick={() => setEcraAtual('encomendas_concluidas')} style={{...btnCard, padding: '20px', fontSize: '1rem', backgroundColor: 'var(--surface-color)', border: '2px dashed #22c55e', color: '#22c55e'}}>
                ✅ Concluídas
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }}></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={() => setEcraAtual('novo_produto')} style={btnSecondary}>➕ Novo Produto</button>
              <button onClick={() => setEcraAtual('catalogo')} style={btnCard}>📋 Catálogo</button>
              <button onClick={() => setEcraAtual('relatorio')} style={{...btnCard, gridColumn: 'span 2'}}>📊 Histórico Expedições</button>
            </div>
          </div>
        )}

        {/* ECRÃ OPs PENDENTES */}
        {ecraAtual === 'encomendas_pendentes' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Encomendas por Entregar</h2>
            
            {encomendas.filter(e => e.estado === 'pendente').length === 0 ? (
               <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Não existem encomendas pendentes.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {agruparEncomendasPendentes().map(grupo => {
                  const status = calcularStatusData(grupo.data_entrega);
                  return (
                    <div key={grupo.op_numero} style={{ backgroundColor: 'var(--surface-color)', border: `2px solid ${status.corBorda}`, borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <strong style={{ fontSize: '1.2rem' }}>{grupo.op_numero}</strong>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{status.icone} {status.texto}</div>
                          {editandoOpId !== grupo.op_numero && (
                            <button onClick={() => iniciarEdicaoOp(grupo)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }} title="Editar OP">✏️</button>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ padding: '15px' }}>
                        {editandoOpId === grupo.op_numero ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.2s' }}>
                            <div>
                              <label style={{...labelStyle, fontSize: '0.85rem'}}>Nova Data de Entrega:</label>
                              <input type="date" value={editOpData} onChange={e => setEditOpData(e.target.value)} style={{...inputStyle, padding: '8px'}} />
                            </div>
                            <div>
                              <label style={{...labelStyle, fontSize: '0.85rem'}}>Ajustar Quantidades (Faltam entregar):</label>
                              {grupo.itens.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                                  <span style={{ fontSize: '0.95rem' }}>{item.artigo_nome}</span>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={editOpQuantidades[item.id] || ''} 
                                    onChange={e => setEditOpQuantidades({...editOpQuantidades, [item.id]: parseInt(e.target.value) || 0})}
                                    style={{...inputStyle, width: '90px', padding: '6px', textAlign: 'center'}}
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                              <button onClick={() => setEditandoOpId(null)} style={{...btnSecondary, padding: '10px', flex: 1}}>Cancelar</button>
                              <button onClick={() => guardarEdicaoOp(grupo.op_numero)} style={{...btnPrimary, backgroundColor: '#22c55e', padding: '10px', flex: 1}}>Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Falta produzir/entregar:</h4>
                            {grupo.itens.map(item => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                                <span>{item.artigo_nome}</span>
                                <strong style={{ color: 'var(--primary-color)' }}>{item.quantidade_pedida} un.</strong>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ECRÃ OPs CONCLUÍDAS */}
        {ecraAtual === 'encomendas_concluidas' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>OPs Concluídas</h2>
            
            {encomendas.filter(e => e.estado === 'concluida').length === 0 ? (
               <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Não existem OPs concluídas registadas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {agruparEncomendasConcluidas().map(grupo => {
                  const lotesAssociados = obterLotesDaOP(grupo.op_numero);
                  return (
                    <div key={grupo.op_numero} style={{ backgroundColor: 'var(--surface-color)', border: `1px solid var(--border-color)`, borderRadius: '12px', overflow: 'hidden', opacity: 0.85 }}>
                      <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '1.2rem', color: '#22c55e' }}>✅ {grupo.op_numero}</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Finalizada</span>
                      </div>
                      
                      {lotesAssociados.length > 0 && (
                        <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Guias de Expedição Associadas:</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {lotesAssociados.map(loteId => (
                              <div key={loteId} style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--primary-color)' }}>📦 {loteId}</div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button 
                                    onClick={() => {
                                      const loteData = agruparSaidas().find(g => g.lote_id === loteId);
                                      if (loteData) gerarPDF(loteData, false);
                                    }} 
                                    style={{ ...btnSecondary, padding: '8px', fontSize: '0.85rem', flex: 1 }}
                                  >
                                    📄 Guia Cliente
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const loteData = agruparSaidas().find(g => g.lote_id === loteId);
                                      if (loteData) gerarPDF(loteData, true);
                                    }} 
                                    style={{ ...btnPrimary, padding: '8px', fontSize: '0.85rem', flex: 1 }}
                                  >
                                    📄 Guia Interna
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REGISTAR ENTRADA */}
        {ecraAtual === 'nova_encomenda' && (
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
                <button onClick={() => setNovaOpLista(novaOpLista.filter((_, index) => index !== i))} style={{ background: 'none', border: 'none', color: '#ef4444' }}>✕</button>
              </div>
            ))}

            {novaOpLista.length > 0 && (
              <button onClick={guardarNovaEncomenda} style={{...btnPrimary, marginTop: '20px', backgroundColor: '#8b5cf6'}}>💾 Guardar OP Completa</button>
            )}
          </div>
        )}

        {/* ESCOLHER MODO DE EXPEDIÇÃO */}
        {ecraAtual === 'escolher_expedicao' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Modo de Expedição</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>🎯 Expedição por OP (Inteligente)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>O sistema ajuda a controlar as quantidades exatas que faltam entregar.</p>
                <select value={opSelecionada} onChange={e => setOpSelecionada(e.target.value)} style={{...inputStyle, marginBottom: '15px'}}>
                  <option value="" disabled>Selecione a OP pendente...</option>
                  {obterOportunidadesPendentes().map(op => <option key={op} value={op}>{op}</option>)}
                </select>
                <button onClick={iniciarExpedicaoOP} style={btnPrimary}>Iniciar Expedição Desta OP</button>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 'bold' }}>OU</div>
              <div style={{ backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>🔓 Expedição Livre (Manual)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>Envio direto sem controlo de encomendas prévias.</p>
                <button onClick={iniciarExpedicaoLivre} style={btnSecondary}>Iniciar Expedição Livre</button>
              </div>
            </div>
          </div>
        )}

        {/* ECRÃ: RESUMO DA EXPEDIÇÃO */}
        {ecraAtual === 'resumo_expedicao' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
              {modoExpedicao === 'op' ? `Lote de Expedição (${opSelecionada})` : 'Lote de Expedição Livre'}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
              <button onClick={() => { setModoSaida('scanner'); setPausarCamara(false); setEcraAtual('scanner'); }} style={{...btnSecondary, borderStyle: 'dashed'}}>📷 Picar Código</button>
              <button onClick={() => { setModoSaida('manual'); setArtigoSelecionado(null); setEcraAtual('formulario_saida'); }} style={{...btnSecondary, borderStyle: 'dashed'}}>✍️ Inserir Manual</button>
            </div>

            {modoExpedicao === 'op' && (
              <div style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', marginBottom: '25px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>Falta Entregar nesta OP:</h3>
                {encomendas.filter(e => e.op_numero === opSelecionada).map(enc => {
                  const qtdLida = listaExpedicao.filter(l => l.artigo_codigo === enc.artigo_codigo).reduce((sum, curr) => sum + curr.quantidade, 0);
                  const concluido = qtdLida >= enc.quantidade_pedida;
                  return (
                    <div key={enc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                      <span style={{ color: concluido ? '#22c55e' : 'var(--text-primary)', textDecoration: concluido ? 'line-through' : 'none' }}>{enc.artigo_nome}</span>
                      <strong style={{ color: concluido ? '#22c55e' : '#ef4444' }}>{qtdLida} / {enc.quantidade_pedida} {concluido ? '✅' : ''}</strong>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Peças Lidas ({listaExpedicao.length})</h3>
            {listaExpedicao.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>O lote está vazio. Comece a picar material!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
                {listaExpedicao.map((item, index) => (
                  <div key={index} style={{ backgroundColor: 'var(--surface-color)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block' }}>{item.quantidade}x {item.artigo_nome}</strong>
                      <small style={{ color: 'var(--text-secondary)' }}>OP: {item.op_numero} | Tam: {item.tamanho}</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold' }}>{item.total_faturado.toFixed(2)}€</span>
                      <button onClick={() => removerDoLoteTemporario(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {listaExpedicao.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}>
                  <span>Faturação do Lote:</span>
                  <span style={{ color: 'var(--primary-color)' }}>{listaExpedicao.reduce((sum, item) => sum + item.total_faturado, 0).toFixed(2)}€</span>
                </div>
                <button onClick={finalizarExpedicao} style={{...btnPrimary, backgroundColor: '#22c55e'}}>💾 Registar e Finalizar Lote</button>
              </div>
            )}
          </div>
        )}

        {/* SCANNER */}
        {ecraAtual === 'scanner' && (
          <div style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Ler Peça</h2>
            <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--primary-color)', backgroundColor: 'black' }}>
              {!pausarCamara ? <Scanner onScan={processarLeituraScanner} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-color)', color: 'var(--primary-color)' }}>A processar...</div>}
            </div>
            <button onClick={() => setEcraAtual('resumo_expedicao')} style={{...btnSecondary, marginTop: '20px'}}>Cancelar Leitura</button>
          </div>
        )}

        {/* FORMULÁRIO DE SAÍDA */}
        {ecraAtual === 'formulario_saida' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Detalhes da Peça</h2>
            <form onSubmit={adicionarAoLote} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Artigo</label>
                {modoSaida === 'scanner' && artigoSelecionado ? (
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--primary-color)', color: 'white' }}>{artigoSelecionado.codigo} - {artigoSelecionado.nome}</div>
                ) : (
                  <select value={artigoSelecionado?.id || ''} onChange={e => setArtigoSelecionado(artigos.find(a => a.id === parseInt(e.target.value)) || null)} required style={inputStyle}>
                    <option value="" disabled>Selecione um artigo...</option>
                    {artigos.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nome}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={labelStyle}>OP n.º (Ordem de Produção)</label>
                {modoExpedicao === 'op' ? (
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Bloqueado à {opSelecionada}</div>
                ) : (
                  <input type="text" value={formOP} onChange={e => setFormOP(e.target.value)} required placeholder="Ex: OP-001" style={inputStyle} />
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label style={labelStyle}>Tamanho (Ex: Vários)</label><input type="text" value={formTamanho} onChange={e => setFormTamanho(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Quantidade</label><input type="number" min="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} required style={inputStyle} /></div>
              </div>
              <button type="submit" style={btnPrimary}>➕ Adicionar ao Lote</button>
            </form>
          </div>
        )}

        {/* NOVO PRODUTO */}
        {ecraAtual === 'novo_produto' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Novo Produto</h2>
            <form onSubmit={registarNovoProduto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={labelStyle}>Código do Artigo (ex: ART-011)</label><input type="text" value={novoCod} onChange={e => setNovoCod(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Nome do Artigo</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Preço Unitário (€)</label><input type="number" step="0.01" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} required style={inputStyle} /></div>
              <button type="submit" style={btnPrimary}>Guardar Produto</button>
            </form>
          </div>
        )}

        {/* CATÁLOGO */}
        {ecraAtual === 'catalogo' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Catálogo ({artigos.length})</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {artigos.map(artigo => (
                <div key={artigo.id} style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{artigo.nome}</strong><small style={{ color: 'var(--text-secondary)' }}>{artigo.codigo}</small></div>
                  {editandoPrecoId === artigo.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="number" step="0.01" value={precoEditado} onChange={e => setPrecoEditado(e.target.value)} autoFocus style={{ ...inputStyle, width: '80px', padding: '8px' }} />
                      <button onClick={() => guardarNovoPreco(artigo.id)} style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                      <button onClick={() => setEditandoPrecoId(null)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.1rem', marginRight: '4px' }}>{Number(artigo.preco).toFixed(2)}€</span>
                      <button onClick={() => { setEditandoPrecoId(artigo.id); setPrecoEditado(artigo.preco.toString()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>✏️</button>
                      <button onClick={() => pedirConfirmacaoApagar(artigo.id, 'artigo')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RELATÓRIO */}
        {ecraAtual === 'relatorio' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Histórico Total</h2>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '20px', borderRadius: '16px', marginBottom: '25px' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 5px 0', fontSize: '0.9rem' }}>Faturação Global</p>
              <h3 style={{ margin: 0, fontSize: '2.5rem', color: 'white' }}>{saidas.reduce((soma, saida) => soma + Number(saida.total_faturado), 0).toFixed(2)}€</h3>
            </div>
            {saidas.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhum movimento registado.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {agruparSaidas().map(grupo => (
                  <div key={grupo.lote_id} style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--primary-color)' }}>{grupo.lote_id.startsWith('Expedição') ? `📦 ${grupo.lote_id}` : '📦 Registo Antigo'}</strong>
                        <small style={{ color: 'var(--text-secondary)' }}>{new Date(grupo.data).toLocaleString('pt-PT')}</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{grupo.total_faturado.toFixed(2)}€</div>
                        {grupo.lote_id.startsWith('Expedição') && (
                          <button onClick={() => pedirConfirmacaoApagarLoteInteiro(grupo.lote_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.4rem', padding: '4px' }}>🗑️</button>
                        )}
                      </div>
                    </div>
                    {grupo.lote_id.startsWith('Expedição') && (
                      <div style={{ display: 'flex', gap: '10px', padding: '15px 15px 0 15px' }}>
                        <button onClick={() => gerarPDF(grupo, false)} style={{...btnSecondary, padding: '10px', fontSize: '0.85rem', flex: 1}}>📄 Guia Cliente</button>
                        <button onClick={() => gerarPDF(grupo, true)} style={{...btnPrimary, padding: '10px', fontSize: '0.85rem', flex: 1}}>📄 Guia Interna</button>
                      </div>
                    )}
                    <div style={{ padding: '15px' }}>
                      {grupo.itens.map((saida: Saida) => (
                        <div key={saida.id} style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem' }}>{saida.quantidade}x {saida.artigo_nome}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OP: {saida.op_numero} | Tam: {saida.tamanho}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{Number(saida.total_faturado).toFixed(2)}€</span>
                            <button onClick={() => pedirConfirmacaoApagar(saida.id, 'saida')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '4px' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ALERTAS */}
      {alerta.visivel && (
        <div style={{...modalOverlayStyle, zIndex: 2000}}>
          <div style={modalBoxStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{alerta.tipo === 'sucesso' ? '✅' : alerta.tipo === 'erro' ? '❌' : '⚠️'}</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{alerta.titulo}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4' }}>{alerta.mensagem}</p>
            <button onClick={fecharAlerta} style={btnPrimary}>OK</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      {modalConfirmacao.aberto && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
              {modalConfirmacao.tipo === 'logout' ? '🚪' : modalConfirmacao.tipo === 'cancelar_lote' ? '🛑' : '⚠️'}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {modalConfirmacao.tipo === 'logout' ? 'Terminar Sessão' : modalConfirmacao.tipo === 'cancelar_lote' ? 'Cancelar Expedição' : modalConfirmacao.tipo === 'lote_inteiro' ? 'Eliminar Lote Inteiro' : 'Confirmar Eliminação'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4' }}>
              {modalConfirmacao.tipo === 'logout' ? 'Tem a certeza que deseja sair da sua conta?' : 
               modalConfirmacao.tipo === 'cancelar_lote' ? 'Vai perder as peças que já adicionou a este lote. Deseja cancelar?' : 
               modalConfirmacao.tipo === 'lote_inteiro' ? 'Tem a certeza que deseja apagar a expedição COMPLETA? Todas as peças deste lote vão ser apagadas.' :
               <>Tem a certeza que deseja apagar este registo?<br/>Esta ação não pode ser desfeita.</>}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cancelarModal} style={{ ...btnSecondary, padding: '12px', flex: 1 }}>Voltar</button>
              <button onClick={executarAcaoModal} style={{ ...btnPrimary, backgroundColor: modalConfirmacao.tipo === 'logout' ? 'var(--primary-color)' : '#ef4444', padding: '12px', flex: 1 }}>
                {modalConfirmacao.tipo === 'logout' ? 'Sair' : modalConfirmacao.tipo === 'cancelar_lote' ? 'Descartar' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; background: var(--bg-color); color: var(--primary-color); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '2px solid var(--border-color)', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
const btnCard: React.CSSProperties = { backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', height: '100%' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBoxStyle: React.CSSProperties = { backgroundColor: 'var(--surface-color)', padding: '25px', borderRadius: '16px', width: '85%', maxWidth: '350px', textAlign: 'center', border: '1px solid var(--border-color)', animation: 'modalFadeIn 0.2s ease-out' };