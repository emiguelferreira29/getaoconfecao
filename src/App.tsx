import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from './supabase';
import './index.css';

// --- TIPOS DE DADOS ---
type Artigo = { id: number; codigo: string; nome: string; preco: number; };
type Saida = { id: number; artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; data: string; op_numero: string; tamanho: string; };
type Ecra = 'home' | 'catalogo' | 'novo_produto' | 'escolher_saida' | 'scanner' | 'formulario_saida' | 'relatorio';

export default function App() {
  const [ecraAtual, setEcraAtual] = useState<Ecra>('home');
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [aCarregar, setACarregar] = useState<boolean>(true);
  
  // Estados para o Formulário de Saída
  const [modoSaida, setModoSaida] = useState<'scanner' | 'manual' | null>(null);
  const [artigoSelecionado, setArtigoSelecionado] = useState<Artigo | null>(null);
  const [pausarCamara, setPausarCamara] = useState<boolean>(false);

  // Estados dos inputs
  const [formOP, setFormOP] = useState('');
  const [formTamanho, setFormTamanho] = useState('');
  const [formQtd, setFormQtd] = useState('');
  
  const [novoCod, setNovoCod] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setACarregar(true);
    const { data: dadosArtigos } = await supabase.from('artigos').select('*').order('nome');
    if (dadosArtigos) setArtigos(dadosArtigos);

    const { data: dadosSaidas } = await supabase.from('saidas').select('*').order('data', { ascending: false });
    if (dadosSaidas) setSaidas(dadosSaidas);
    setACarregar(false);
  }

  // --- LÓGICA DE REGISTO ---
  const registarNovoProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(novoPreco.replace(',', '.'));
    if (!novoCod || !novoNome || isNaN(precoNum)) return alert('Preencha todos os campos corretamente.');

    const { error } = await supabase.from('artigos').insert({ codigo: novoCod, nome: novoNome, preco: precoNum });
    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      alert('Produto registado com sucesso!');
      setNovoCod(''); setNovoNome(''); setNovoPreco('');
      carregarDados();
      setEcraAtual('catalogo');
    }
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
      alert(`O código "${codigoQR}" não existe no catálogo.`);
      setTimeout(() => setPausarCamara(false), 2000);
    }
  };

  const guardarSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artigoSelecionado) return alert('Selecione um artigo.');
    
    const qtdNum = parseInt(formQtd);
    if (isNaN(qtdNum) || qtdNum <= 0) return alert('Quantidade inválida.');

    const totalCalculado = qtdNum * artigoSelecionado.preco;

    const { error } = await supabase.from('saidas').insert({
      artigo_codigo: artigoSelecionado.codigo,
      artigo_nome: artigoSelecionado.nome,
      quantidade: qtdNum,
      total_faturado: totalCalculado,
      op_numero: formOP,
      tamanho: formTamanho
    });

    if (error) {
      alert(`Erro ao guardar: ${error.message}`);
    } else {
      alert(`✅ Guardado: ${qtdNum}x ${artigoSelecionado.nome}`);
      setFormOP(''); setFormTamanho(''); setFormQtd('');
      setArtigoSelecionado(null);
      carregarDados();
      setEcraAtual('home');
    }
  };

  // --- INTERFACE (UI) ---
  if (aCarregar) return <div className="loading">A sincronizar com a base de dados...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      <header style={{ padding: '20px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>Confeção</h1>
        {ecraAtual !== 'home' && (
          <button onClick={() => setEcraAtual('home')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
            ◀ Voltar
          </button>
        )}
      </header>

      <main style={{ padding: '20px', paddingBottom: '90px' }}>
        
        {/* 1. PÁGINA DE ROSTO (HOME) */}
        {ecraAtual === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Painel Principal</h2>
            
            <button onClick={() => setEcraAtual('escolher_saida')} style={btnPrimary}>
              📦 Registar Saída de Produto
            </button>
            <button onClick={() => setEcraAtual('novo_produto')} style={btnSecondary}>
              ➕ Registar Novo Produto
            </button>
            
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '20px 0' }}></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={() => setEcraAtual('catalogo')} style={btnCard}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📋</span>
                Ver Catálogo
              </button>
              <button onClick={() => setEcraAtual('relatorio')} style={btnCard}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📊</span>
                Relatórios
              </button>
            </div>
          </div>
        )}

        {/* 2. REGISTAR NOVO PRODUTO */}
        {ecraAtual === 'novo_produto' && (
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
                <label style={labelStyle}>Preço Unitário (€)</label>
                <input type="number" step="0.01" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} required style={inputStyle} />
              </div>
              <button type="submit" style={btnPrimary}>Guardar Produto</button>
            </form>
          </div>
        )}

        {/* 3. ESCOLHER TIPO DE SAÍDA */}
        {ecraAtual === 'escolher_saida' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Método de Registo</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={() => { setModoSaida('scanner'); setPausarCamara(false); setEcraAtual('scanner'); }} style={btnPrimary}>
                📷 Usar Scanner (QR Code)
              </button>
              <button onClick={() => { setModoSaida('manual'); setArtigoSelecionado(null); setEcraAtual('formulario_saida'); }} style={btnSecondary}>
                ✍️ Introdução Manual
              </button>
            </div>
          </div>
        )}

        {/* 4. SCANNER */}
        {ecraAtual === 'scanner' && (
          <div style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Ler Código</h2>
            <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--primary-color)', backgroundColor: 'black' }}>
              {!pausarCamara ? (
                <Scanner onScan={processarLeituraScanner} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-color)', color: 'var(--primary-color)' }}>
                  A processar...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. FORMULÁRIO DE SAÍDA (Comum a Manual e Scanner) */}
        {ecraAtual === 'formulario_saida' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Detalhes da Saída</h2>
            <form onSubmit={guardarSaida} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Seleção de Artigo: Bloqueado se for Scanner, Dropdown se for Manual */}
              <div>
                <label style={labelStyle}>Artigo</label>
                {modoSaida === 'scanner' && artigoSelecionado ? (
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--primary-color)', color: 'white' }}>
                    {artigoSelecionado.codigo} - {artigoSelecionado.nome}
                  </div>
                ) : (
                  <select 
                    value={artigoSelecionado?.id || ''} 
                    onChange={e => setArtigoSelecionado(artigos.find(a => a.id === parseInt(e.target.value)) || null)}
                    required
                    style={inputStyle}
                  >
                    <option value="" disabled>Selecione um artigo na lista...</option>
                    {artigos.map(a => (
                      <option key={a.id} value={a.id}>{a.codigo} - {a.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={labelStyle}>OP n.º (Ordem de Produção)</label>
                <input type="text" value={formOP} onChange={e => setFormOP(e.target.value)} required placeholder="Ex: OP-2024-15" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>Tamanho</label>
                  <input type="text" value={formTamanho} onChange={e => setFormTamanho(e.target.value)} required placeholder="Ex: L, XL, 42..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Quantidade</label>
                  <input type="number" min="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} required style={inputStyle} />
                </div>
              </div>

              <button type="submit" style={{ ...btnPrimary, marginTop: '10px' }}>Confirmar e Guardar Saída</button>
            </form>
          </div>
        )}

        {/* 6. CATÁLOGO */}
        {ecraAtual === 'catalogo' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Catálogo ({artigos.length})</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {artigos.map(artigo => (
                <div key={artigo.id} style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{artigo.nome}</strong>
                    <small style={{ color: 'var(--text-secondary)' }}>{artigo.codigo}</small>
                  </div>
                  <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                    {Number(artigo.preco).toFixed(2)}€
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. RELATÓRIO */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {saidas.map(saida => (
                  <div key={saida.id} style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '4px' }}>{saida.quantidade}x {saida.artigo_nome}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>OP: {saida.op_numero}</span> • <span>Tam: {saida.tamanho}</span>
                      </div>
                      <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                        {new Date(saida.data).toLocaleDateString('pt-PT')}
                      </small>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                      {Number(saida.total_faturado).toFixed(2)}€
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; background: var(--bg-color); color: var(--primary-color); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// --- ESTILOS REUTILIZÁVEIS ---
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
};

const btnSecondary: React.CSSProperties = {
  width: '100%', padding: '15px', backgroundColor: 'transparent', color: 'var(--primary-color)', border: '2px solid var(--primary-color)', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
};

const btnCard: React.CSSProperties = {
  backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem'
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold'
};