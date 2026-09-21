import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from './supabase';
import './index.css';

// --- TIPOS DE DADOS ---
type Artigo = { id: number; codigo: string; nome: string; preco: number; };
type Saida = { id: number; artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; data: string; op_numero: string; tamanho: string; lote_id: string | null; };
type ItemExpedicao = { artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; op_numero: string; tamanho: string; };
type Ecra = 'home' | 'catalogo' | 'novo_produto' | 'resumo_expedicao' | 'scanner' | 'formulario_saida' | 'relatorio';

export default function App() {
  // --- SISTEMA DE LOGIN ---
  const [autenticado, setAutenticado] = useState<boolean>(() => localStorage.getItem('autenticadoConfecao') === 'true');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // --- NAVEGAÇÃO ---
  const [ecraAtual, setEcraAtual] = useState<Ecra>(() => (localStorage.getItem('ecraAtualConfecao') as Ecra) || 'home');

  useEffect(() => {
    localStorage.setItem('ecraAtualConfecao', ecraAtual);
  }, [ecraAtual]);

  // --- DADOS DA BASE DE DADOS ---
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [aCarregar, setACarregar] = useState<boolean>(true);
  
  // --- ESTADOS DO LOTE DE EXPEDIÇÃO ---
  const [listaExpedicao, setListaExpedicao] = useState<ItemExpedicao[]>([]);
  
  // --- ESTADOS PARA O FORMULÁRIO DE SAÍDA ---
  const [modoSaida, setModoSaida] = useState<'scanner' | 'manual' | null>(null);
  const [artigoSelecionado, setArtigoSelecionado] = useState<Artigo | null>(null);
  const [pausarCamara, setPausarCamara] = useState<boolean>(false);
  const [formOP, setFormOP] = useState('');
  const [formTamanho, setFormTamanho] = useState('');
  const [formQtd, setFormQtd] = useState('');
  
  // --- ESTADOS PARA NOVO PRODUTO ---
  const [novoCod, setNovoCod] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [editandoPrecoId, setEditandoPrecoId] = useState<number | null>(null);
  const [precoEditado, setPrecoEditado] = useState<string>('');

  // --- MODAIS DA APLICAÇÃO (Confirmação e Alertas) ---
  const [modalConfirmacao, setModalConfirmacao] = useState<{ aberto: boolean; tipo: 'saida' | 'artigo' | 'logout' | 'cancelar_lote' | null; idParaApagar: number | null }>({ aberto: false, tipo: null, idParaApagar: null });
  const [alerta, setAlerta] = useState<{ visivel: boolean; titulo: string; mensagem: string; tipo: 'sucesso' | 'erro' | 'aviso' }>({ visivel: false, titulo: '', mensagem: '', tipo: 'sucesso' });

  // Função centralizada para mostrar avisos na plataforma
  const mostrarAlerta = (titulo: string, mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'aviso') => {
    setAlerta({ visivel: true, titulo, mensagem, tipo });
  };
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  useEffect(() => {
    if (autenticado) carregarDados();
  }, [autenticado]);

  async function carregarDados() {
    setACarregar(true);
    const { data: dadosArtigos, error: erroArtigos } = await supabase.from('artigos').select('*').order('codigo');
    if (erroArtigos) {
      mostrarAlerta('Erro de Ligação', erroArtigos.message, 'erro');
      console.error(erroArtigos);
    } else if (dadosArtigos) setArtigos(dadosArtigos);

    const { data: dadosSaidas, error: erroSaidas } = await supabase.from('saidas').select('*').order('data', { ascending: false });
    if (erroSaidas) {
      mostrarAlerta('Erro de Ligação', erroSaidas.message, 'erro');
      console.error(erroSaidas);
    } else if (dadosSaidas) setSaidas(dadosSaidas);
    
    setACarregar(false);
  }

  // --- LÓGICA DE AUTENTICAÇÃO ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if ((loginUser === 'nelaze' && loginPass === '1988') || (loginUser === 'admin' && loginPass === 'admin')) {
      setAutenticado(true);
      localStorage.setItem('autenticadoConfecao', 'true');
      setLoginUser(''); setLoginPass('');
    } else {
      mostrarAlerta('Acesso Negado', 'Credenciais incorretas. Tente novamente.', 'erro');
    }
  };

  const handleLogout = () => {
    setModalConfirmacao({ aberto: true, tipo: 'logout', idParaApagar: null });
  };

  // --- LÓGICA DE CATÁLOGO ---
  const registarNovoProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(novoPreco.replace(',', '.'));
    if (!novoCod || !novoNome || isNaN(precoNum)) {
      return mostrarAlerta('Atenção', 'Preencha todos os campos corretamente.', 'aviso');
    }

    const { error } = await supabase.from('artigos').insert({ codigo: novoCod, nome: novoNome, preco: precoNum });
    if (error) {
      mostrarAlerta('Erro ao Guardar', error.message, 'erro');
    } else { 
      mostrarAlerta('Sucesso', 'O artigo foi registado com sucesso no catálogo!', 'sucesso');
      setNovoCod(''); setNovoNome(''); setNovoPreco(''); 
      carregarDados(); 
      setEcraAtual('catalogo'); 
    }
  };

  const guardarNovoPreco = async (id: number) => {
    const precoNum = parseFloat(precoEditado.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) return mostrarAlerta('Atenção', 'O preço introduzido é inválido.', 'aviso');
    const { error } = await supabase.from('artigos').update({ preco: precoNum }).eq('id', id);
    if (error) {
      mostrarAlerta('Erro ao Atualizar', error.message, 'erro');
    } else { 
      setEditandoPrecoId(null); 
      carregarDados(); 
    }
  };

  // --- LÓGICA DO NOVO LOTE DE EXPEDIÇÃO ---
  const iniciarNovaExpedicao = () => {
    setListaExpedicao([]);
    setEcraAtual('resumo_expedicao');
  };

  const processarLeituraScanner = (codigosLidos: any[]) => {
    if (codigosLidos.length === 0 || pausarCamara) return;
    const codigoQR = codigosLidos[0].rawValue;
    setPausarCamara(true);

    const artigo = artigos.find(a => a.codigo === codigoQR);
    if (artigo) {
      setArtigoSelecionado(artigo);
      setEcraAtual('formulario_saida');
    } else {
      mostrarAlerta('Artigo não encontrado', `O código "${codigoQR}" não existe no catálogo.`, 'aviso');
      setTimeout(() => setPausarCamara(false), 2000);
    }
  };

  const adicionarAoLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artigoSelecionado) return mostrarAlerta('Atenção', 'Selecione um artigo da lista.', 'aviso');
    
    const qtdNum = parseInt(formQtd);
    if (isNaN(qtdNum) || qtdNum <= 0) return mostrarAlerta('Atenção', 'A quantidade inserida é inválida.', 'aviso');

    const novoItem: ItemExpedicao = {
      artigo_codigo: artigoSelecionado.codigo,
      artigo_nome: artigoSelecionado.nome,
      quantidade: qtdNum,
      total_faturado: qtdNum * artigoSelecionado.preco,
      op_numero: formOP,
      tamanho: formTamanho
    };

    setListaExpedicao([...listaExpedicao, novoItem]);
    setFormQtd('');
    setArtigoSelecionado(null);
    setEcraAtual('resumo_expedicao');
  };

  const removerDoLoteTemporario = (index: number) => {
    const novaLista = [...listaExpedicao];
    novaLista.splice(index, 1);
    setListaExpedicao(novaLista);
  };

  const finalizarExpedicao = async () => {
    if (listaExpedicao.length === 0) return;

    const loteId = `LOTE-${Date.now()}`;
    const dadosParaInserir = listaExpedicao.map(item => ({
      ...item,
      lote_id: loteId
    }));

    const { error } = await supabase.from('saidas').insert(dadosParaInserir);

    if (error) {
      mostrarAlerta('Erro na Base de Dados', error.message, 'erro');
    } else {
      mostrarAlerta('Expedição Concluída', 'O lote foi registado e faturado com sucesso!', 'sucesso');
      setListaExpedicao([]);
      setFormOP(''); 
      setFormTamanho('');
      carregarDados();
      setEcraAtual('home');
    }
  };

  // --- LÓGICA DO MODAL DE CONFIRMAÇÃO ---
  const pedirConfirmacaoApagar = (id: number, tipo: 'saida' | 'artigo') => {
    setModalConfirmacao({ aberto: true, tipo, idParaApagar: id });
  };

  const pedirConfirmacaoCancelarLote = () => {
    if (listaExpedicao.length > 0) {
      setModalConfirmacao({ aberto: true, tipo: 'cancelar_lote', idParaApagar: null });
    } else {
      setEcraAtual('home');
    }
  };

  const cancelarModal = () => {
    setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });
  };

  const executarAcaoModal = async () => {
    const { idParaApagar, tipo } = modalConfirmacao;
    if (!tipo) return;

    if (tipo === 'logout') {
      setAutenticado(false); localStorage.removeItem('autenticadoConfecao'); setEcraAtual('home');
    } else if (tipo === 'cancelar_lote') {
      setListaExpedicao([]); setEcraAtual('home');
    } else if (tipo === 'saida' && idParaApagar) {
      const { error } = await supabase.from('saidas').delete().eq('id', idParaApagar);
      if (!error) setSaidas(saidas.filter(s => s.id !== idParaApagar)); else mostrarAlerta('Erro', error.message, 'erro');
    } else if (tipo === 'artigo' && idParaApagar) {
      const { error } = await supabase.from('artigos').delete().eq('id', idParaApagar);
      if (!error) setArtigos(artigos.filter(a => a.id !== idParaApagar)); else mostrarAlerta('Erro', error.message, 'erro');
    }
    setModalConfirmacao({ aberto: false, tipo: null, idParaApagar: null });
  };

  // --- PREPARAÇÃO DE DADOS PARA O RELATÓRIO ---
  const agruparSaidas = () => {
    const grupos = saidas.reduce((acc, saida) => {
      const chave = saida.lote_id || `avulso-${saida.id}`; 
      if (!acc[chave]) {
        acc[chave] = { lote_id: chave, data: saida.data, total_faturado: 0, itens: [] };
      }
      acc[chave].total_faturado += Number(saida.total_faturado);
      acc[chave].itens.push(saida);
      return acc;
    }, {} as Record<string, { lote_id: string; data: string; total_faturado: number; itens: Saida[] }>);
    return Object.values(grupos).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  };


  // --- ECRÃ DE LOGIN ---
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
        {alerta.visivel && (
          <div style={modalOverlayStyle}>
            <div style={modalBoxStyle}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{alerta.tipo === 'sucesso' ? '✅' : alerta.tipo === 'erro' ? '❌' : '⚠️'}</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{alerta.titulo}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem' }}>{alerta.mensagem}</p>
              <button onClick={fecharAlerta} style={btnPrimary}>OK</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (aCarregar) return <div className="loading">A sincronizar com a base de dados...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      
      {/* CABEÇALHO */}
      <header style={{ padding: '20px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Logótipo" style={{ height: '35px', width: '35px', objectFit: 'contain', borderRadius: '8px' }} />
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>Confeção</h1>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {ecraAtual !== 'home' && (
            <button 
              onClick={() => ecraAtual === 'resumo_expedicao' ? pedirConfirmacaoCancelarLote() : setEcraAtual('home')} 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ◀ Voltar
            </button>
          )}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }} title="Terminar Sessão">🚪</button>
        </div>
      </header>

      <main style={{ padding: '20px', paddingBottom: '90px' }}>
        
        {/* 1. HOME */}
        {ecraAtual === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Painel Principal</h2>
            <button onClick={iniciarNovaExpedicao} style={{...btnPrimary, padding: '20px', fontSize: '1.1rem'}}>📦 Nova Expedição de Lote</button>
            <button onClick={() => setEcraAtual('novo_produto')} style={btnSecondary}>➕ Registar Novo Produto</button>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '20px 0' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={() => setEcraAtual('catalogo')} style={btnCard}><span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📋</span>Catálogo</button>
              <button onClick={() => setEcraAtual('relatorio')} style={btnCard}><span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📊</span>Relatórios</button>
            </div>
          </div>
        )}

        {/* 2. ECRÃ: RESUMO DA EXPEDIÇÃO */}
        {ecraAtual === 'resumo_expedicao' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Lote de Expedição Atual</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
              <button onClick={() => { setModoSaida('scanner'); setPausarCamara(false); setEcraAtual('scanner'); }} style={{...btnSecondary, borderStyle: 'dashed'}}>
                📷 Picar Código
              </button>
              <button onClick={() => { setModoSaida('manual'); setArtigoSelecionado(null); setEcraAtual('formulario_saida'); }} style={{...btnSecondary, borderStyle: 'dashed'}}>
                ✍️ Inserir Manual
              </button>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Peças no Lote ({listaExpedicao.length})</h3>
            
            {listaExpedicao.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                O lote está vazio. Comece a picar material!
              </p>
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
                <button onClick={finalizarExpedicao} style={{...btnPrimary, backgroundColor: '#22c55e'}}>
                  💾 Registar e Finalizar Lote
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. SCANNER */}
        {ecraAtual === 'scanner' && (
          <div style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Ler Peça</h2>
            <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--primary-color)', backgroundColor: 'black' }}>
              {!pausarCamara ? (
                <Scanner onScan={processarLeituraScanner} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-color)', color: 'var(--primary-color)' }}>A processar...</div>
              )}
            </div>
            <button onClick={() => setEcraAtual('resumo_expedicao')} style={{...btnSecondary, marginTop: '20px'}}>Cancelar Leitura</button>
          </div>
        )}

        {/* 4. FORMULÁRIO DE SAÍDA */}
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
                <input type="text" value={formOP} onChange={e => setFormOP(e.target.value)} required placeholder="Ex: OP-2024-15" style={inputStyle} />
                <small style={{color: 'var(--text-secondary)'}}>A OP fica gravada para a próxima peça automaticamente.</small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label style={labelStyle}>Tamanho</label><input type="text" value={formTamanho} onChange={e => setFormTamanho(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Quantidade</label><input type="number" min="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} required style={inputStyle} /></div>
              </div>

              <button type="submit" style={btnPrimary}>➕ Adicionar ao Lote</button>
            </form>
          </div>
        )}

        {/* 5. REGISTAR NOVO PRODUTO */}
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

        {/* 6. CATÁLOGO COM EDIÇÃO */}
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

        {/* 7. RELATÓRIO AGRUPADO */}
        {ecraAtual === 'relatorio' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Histórico Total</h2>
            
            <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '20px', borderRadius: '16px', marginBottom: '25px' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 5px 0', fontSize: '0.9rem' }}>Faturação Global</p>
              <h3 style={{ margin: 0, fontSize: '2.5rem', color: 'white' }}>
                {saidas.reduce((soma, saida) => soma + Number(saida.total_faturado), 0).toFixed(2)}€
              </h3>
            </div>

            {saidas.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhum movimento registado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {agruparSaidas().map(grupo => (
                  <div key={grupo.lote_id} style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--primary-color)' }}>
                          {grupo.lote_id.startsWith('LOTE') ? '📦 Expedição Múltipla' : '📦 Registo Antigo/Avulso'}
                        </strong>
                        <small style={{ color: 'var(--text-secondary)' }}>{new Date(grupo.data).toLocaleString('pt-PT')}</small>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{grupo.total_faturado.toFixed(2)}€</div>
                    </div>
                    <div style={{ padding: '10px' }}>
                      {grupo.itens.map(saida => (
                        <div key={saida.id} style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
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

      {/* MODAL PARA ALERTAS GERAIS (Sucesso/Erro) */}
      {alerta.visivel && (
        <div style={{...modalOverlayStyle, zIndex: 2000}}>
          <div style={modalBoxStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
              {alerta.tipo === 'sucesso' ? '✅' : alerta.tipo === 'erro' ? '❌' : '⚠️'}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{alerta.titulo}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4' }}>{alerta.mensagem}</p>
            <button onClick={fecharAlerta} style={btnPrimary}>OK</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO (Apagar/Cancelar) */}
      {modalConfirmacao.aberto && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
              {modalConfirmacao.tipo === 'logout' ? '🚪' : modalConfirmacao.tipo === 'cancelar_lote' ? '🛑' : '⚠️'}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {modalConfirmacao.tipo === 'logout' ? 'Terminar Sessão' : modalConfirmacao.tipo === 'cancelar_lote' ? 'Cancelar Expedição' : 'Confirmar Eliminação'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4' }}>
              {modalConfirmacao.tipo === 'logout' ? 'Tem a certeza que deseja sair da sua conta?' : 
               modalConfirmacao.tipo === 'cancelar_lote' ? 'Vai perder as peças que já adicionou a este lote. Deseja cancelar?' : 
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

// --- ESTILOS REUTILIZÁVEIS ---
const btnPrimary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '2px solid var(--border-color)', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
const btnCard: React.CSSProperties = { backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBoxStyle: React.CSSProperties = { backgroundColor: 'var(--surface-color)', padding: '25px', borderRadius: '16px', width: '85%', maxWidth: '350px', textAlign: 'center', border: '1px solid var(--border-color)', animation: 'modalFadeIn 0.2s ease-out' };