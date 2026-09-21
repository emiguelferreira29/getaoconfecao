import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from './supabase';
import './index.css';

type Artigo = { id: number; codigo: string; nome: string; preco: number; };
type Saida = { id: number; artigo_codigo: string; artigo_nome: string; quantidade: number; total_faturado: number; data: string; };
type Ecra = 'catalogo' | 'scanner' | 'relatorio';

export default function App() {
  const [ecraAtual, setEcraAtual] = useState<Ecra>('catalogo');
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [pausarCamara, setPausarCamara] = useState<boolean>(false);
  const [aCarregar, setACarregar] = useState<boolean>(true);

  // 1. Vai buscar os dados reais ao Supabase quando a app abre
  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setACarregar(true);
    
    const { data: dadosArtigos } = await supabase.from('artigos').select('*');
    if (dadosArtigos) setArtigos(dadosArtigos);

    const { data: dadosSaidas } = await supabase.from('saidas').select('*').order('data', { ascending: false });
    if (dadosSaidas) setSaidas(dadosSaidas);
    
    setACarregar(false);
  }

  // 2. Registar a saída real na base de dados
  const lidarComLeitura = async (codigosLidos: any[]) => {
    if (codigosLidos.length === 0 || pausarCamara) return;
    const codigoQR = codigosLidos[0].rawValue;
    setPausarCamara(true);

    const artigoEncontrado = artigos.find(a => a.codigo === codigoQR);
    
    if (artigoEncontrado) {
      const quantidadeStr = window.prompt(`📦 ${artigoEncontrado.nome}\nQuantas peças vai entregar?`);
      const quantidade = parseInt(quantidadeStr || '0');

      if (quantidade > 0) {
        const totalCalculado = quantidade * artigoEncontrado.preco;
        
        // Envia a informação para o Supabase
        const { error } = await supabase.from('saidas').insert({
          artigo_codigo: artigoEncontrado.codigo,
          artigo_nome: artigoEncontrado.nome,
          quantidade: quantidade,
          total_faturado: totalCalculado
        });

        if (error) {
          alert(`❌ Erro a guardar: ${error.message}`);
        } else {
          alert(`✅ Guardado na Nuvem: ${quantidade}x ${artigoEncontrado.nome}\nTotal: ${totalCalculado.toFixed(2)}€`);
          carregarDados(); // Atualiza a lista imediatamente
        }
      }
    } else {
      alert(`❌ Erro: O código "${codigoQR}" não existe no catálogo.`);
    }
    
    // Espera 2.5 segundos para não ler o mesmo código várias vezes
    setTimeout(() => setPausarCamara(false), 2500);
  };

  // Ecrã de carregamento enquanto vai buscar dados ao Supabase
  if (aCarregar) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>
        A sincronizar com a nuvem...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      
      <header style={{ padding: '20px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0, textAlign: 'center', color: 'var(--primary-color)' }}>
          ConfeçãoApp
        </h1>
      </header>

      <main style={{ padding: '20px', paddingBottom: '90px' }}>
        
        {/* ECRÃ 1: CATÁLOGO */}
        {ecraAtual === 'catalogo' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Catálogo ({artigos.length})</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {artigos.map(artigo => (
                <div key={artigo.id} style={{ backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '5px' }}>{artigo.nome}</strong>
                    <small style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{artigo.codigo}</small>
                  </div>
                  <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold' }}>
                    {Number(artigo.preco).toFixed(2)}€
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ECRÃ 2: SCANNER */}
        {ecraAtual === 'scanner' && (
          <div style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Nova Saída</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', textAlign: 'center' }}>Aponte a câmara para o código QR.</p>
            
            <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--primary-color)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)', backgroundColor: 'black' }}>
              {!pausarCamara ? (
                <Scanner onScan={lidarComLeitura} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-color)' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>A processar...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ECRÃ 3: RELATÓRIO */}
        {ecraAtual === 'relatorio' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Histórico Total</h2>
            
            <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '20px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 5px 0', fontSize: '0.9rem' }}>Faturação Global</p>
              <h3 style={{ margin: 0, fontSize: '2.5rem', color: 'white' }}>
                {saidas.reduce((soma, saida) => soma + Number(saida.total_faturado), 0).toFixed(2)}€
              </h3>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Últimos Registos</h3>
            {saidas.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>Nenhum movimento registado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {saidas.map(saida => (
                  <div key={saida.id} style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ backgroundColor: '#2a2a2a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                        {saida.quantidade}x
                      </div>
                      <div>
                        <strong style={{ display: 'block' }}>{saida.artigo_nome}</strong>
                        <small style={{ color: 'var(--text-secondary)' }}>
                          {new Date(saida.data).toLocaleDateString('pt-PT')}
                        </small>
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>{Number(saida.total_faturado).toFixed(2)}€</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', padding: '15px 10px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom))', zIndex: 100 }}>
        <button onClick={() => setEcraAtual('catalogo')} style={navButtonStyle(ecraAtual === 'catalogo')}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📦</span><span>Catálogo</span>
        </button>
        <button onClick={() => setEcraAtual('scanner')} style={navButtonStyle(ecraAtual === 'scanner')}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📷</span><span>Scanner</span>
        </button>
        <button onClick={() => setEcraAtual('relatorio')} style={navButtonStyle(ecraAtual === 'relatorio')}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📊</span><span>Resumo</span>
        </button>
      </nav>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function navButtonStyle(ativo: boolean): React.CSSProperties {
  return {
    backgroundColor: 'transparent',
    border: 'none',
    color: ativo ? 'var(--primary-color)' : 'var(--text-secondary)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    fontSize: '0.75rem', cursor: 'pointer', fontWeight: ativo ? 'bold' : 'normal',
    transition: 'color 0.2s', width: '33%'
  };
}