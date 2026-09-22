import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../supabase';
import { btnPrimary, btnSecondary, inputStyle, labelStyle } from '../components/Modais';
import type { Artigo, Saida, Encomenda, ItemExpedicao, Ecra } from '../App';

type Props = {
  ecraAtual: Ecra;
  setEcraAtual: (ecra: Ecra) => void;
  artigos: Artigo[];
  saidas: Saida[];
  encomendas: Encomenda[];
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo?: 'sucesso' | 'erro' | 'aviso') => void;
  listaExpedicao: ItemExpedicao[];
  setListaExpedicao: React.Dispatch<React.SetStateAction<ItemExpedicao[]>>;
  modoExpedicao: 'livre' | 'op' | null;
  setModoExpedicao: (modo: 'livre' | 'op' | null) => void;
  opSelecionada: string;
  setOpSelecionada: (op: string) => void;
};

export default function Expedicao({
  ecraAtual, setEcraAtual, artigos, saidas, encomendas, carregarDados, mostrarAlerta,
  listaExpedicao, setListaExpedicao, modoExpedicao, setModoExpedicao, opSelecionada, setOpSelecionada
}: Props) {
  const [modoSaida, setModoSaida] = useState<'scanner' | 'manual' | null>(null);
  const [artigoSelecionado, setArtigoSelecionado] = useState<Artigo | null>(null);
  const [pausarCamara, setPausarCamara] = useState<boolean>(false);
  const [formOP, setFormOP] = useState('');
  const [formTamanho, setFormTamanho] = useState('');
  const [formQtd, setFormQtd] = useState('');

  const obterOportunidadesPendentes = () => {
    const opsMap = new Map<string, string | null>();
    encomendas.filter(e => e.estado === 'pendente').forEach(e => opsMap.set(e.op_numero, e.cliente_final || null));
    return Array.from(opsMap.entries()).map(([op, cliente]) => ({ op, cliente }));
  };

  const obterQtdFaltanteItem = (artigoCodigo: string) => {
    if (modoExpedicao !== 'op' || !opSelecionada) return null;
    const enc = encomendas.find(e => e.op_numero === opSelecionada && e.artigo_codigo === artigoCodigo);
    if (!enc) return null;
    const qtdLida = listaExpedicao.filter(l => l.artigo_codigo === artigoCodigo).reduce((sum, curr) => sum + curr.quantidade, 0);
    const falta = enc.quantidade_pedida - qtdLida;
    return falta > 0 ? falta : 0;
  };

  const iniciarExpedicaoLivre = () => {
    setModoExpedicao('livre'); setOpSelecionada(''); setListaExpedicao([]); setFormOP(''); setEcraAtual('resumo_expedicao');
  };

  const iniciarExpedicaoOP = () => {
    if (!opSelecionada) return mostrarAlerta('Atenção', 'Selecione uma OP pendente.', 'aviso');
    setModoExpedicao('op'); setListaExpedicao([]); setFormOP(opSelecionada); setEcraAtual('resumo_expedicao');
  };

  const prepararInsercaoManual = () => {
    setModoSaida('manual');
    if (modoExpedicao === 'op' && opSelecionada) {
      const pendentesOp = encomendas.filter(e => e.op_numero === opSelecionada);
      const itemPendente = pendentesOp.find(enc => {
        const qtdLida = listaExpedicao.filter(l => l.artigo_codigo === enc.artigo_codigo).reduce((sum, curr) => sum + curr.quantidade, 0);
        return enc.quantidade_pedida - qtdLida > 0;
      });

      if (itemPendente) {
        const art = artigos.find(a => a.codigo === itemPendente.artigo_codigo);
        if (art) {
          setArtigoSelecionado(art);
          const falta = obterQtdFaltanteItem(art.codigo);
          setFormQtd(falta !== null && falta > 0 ? falta.toString() : '');
        } else { setArtigoSelecionado(null); setFormQtd(''); }
      } else { setArtigoSelecionado(null); setFormQtd(''); }
    } else { setArtigoSelecionado(null); setFormQtd(''); }
    setEcraAtual('formulario_saida');
  };

  const selecionarArtigoManual = (idArtigo: number) => {
    const art = artigos.find(a => a.id === idArtigo) || null;
    setArtigoSelecionado(art);
    if (art && modoExpedicao === 'op' && opSelecionada) {
      const falta = obterQtdFaltanteItem(art.codigo);
      if (falta !== null && falta > 0) setFormQtd(falta.toString());
    }
  };

  const processarLeituraScanner = (codigosLidos: any[]) => {
    if (codigosLidos.length === 0 || pausarCamara) return;
    const codigoQR = codigosLidos[0].rawValue; 
    setPausarCamara(true);
    const artigo = artigos.find(a => a.codigo === codigoQR);
    if (artigo) { 
      setArtigoSelecionado(artigo); 
      if (modoExpedicao === 'op' && opSelecionada) {
        const falta = obterQtdFaltanteItem(artigo.codigo);
        if (falta !== null && falta > 0) setFormQtd(falta.toString());
      }
      setEcraAtual('formulario_saida'); 
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

  const removerDoLoteTemporario = (index: number) => { const novaLista = [...listaExpedicao]; novaLista.splice(index, 1); setListaExpedicao(novaLista); };

  const finalizarExpedicao = async () => {
    if (listaExpedicao.length === 0) return;
    const hoje = new Date(); const dia = hoje.getDate().toString().padStart(2, '0'); const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `Expedição ${dia}${mes}${hoje.getFullYear()}-`;

    const lotesDeHoje = saidas.map(s => s.lote_id).filter(id => id && id.startsWith(prefixo)) as string[];
    let maxNum = 0;
    Array.from(new Set(lotesDeHoje)).forEach(lote => { const num = parseInt(lote.split('-')[1]); if (!isNaN(num) && num > maxNum) maxNum = num; });

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
    setListaExpedicao([]); setFormOP(''); setFormTamanho(''); carregarDados(); setEcraAtual('home');
  };

  if (ecraAtual === 'escolher_expedicao') {
    return (
      <div style={{ animation: 'fadeIn 0.3s' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Modo de Expedição</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>🎯 Expedição por OP (Inteligente)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>O sistema ajuda a controlar as quantidades exatas que faltam entregar.</p>
            <select value={opSelecionada} onChange={e => setOpSelecionada(e.target.value)} style={{...inputStyle, marginBottom: '15px'}}>
              <option value="" disabled>Selecione a OP pendente...</option>
              {obterOportunidadesPendentes().map(opData => (
                <option key={opData.op} value={opData.op}>{opData.op} {opData.cliente ? `(${opData.cliente})` : ''}</option>
              ))}
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
    );
  }

  if (ecraAtual === 'resumo_expedicao') {
    return (
      <div style={{ animation: 'fadeIn 0.3s' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{modoExpedicao === 'op' ? `Lote de Expedição (${opSelecionada})` : 'Lote de Expedição Livre'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
          <button onClick={() => { setModoSaida('scanner'); setPausarCamara(false); setEcraAtual('scanner'); }} style={{...btnSecondary, borderStyle: 'dashed'}}>📷 Picar Código</button>
          <button onClick={prepararInsercaoManual} style={{...btnSecondary, borderStyle: 'dashed'}}>✍️ Inserir Manual</button>
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
        {listaExpedicao.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>O lote está vazio. Comece a picar material!</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
            {listaExpedicao.map((item, index) => (
              <div key={index} style={{ backgroundColor: 'var(--surface-color)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><strong style={{ display: 'block' }}>{item.quantidade}x {item.artigo_nome}</strong><small style={{ color: 'var(--text-secondary)' }}>OP: {item.op_numero} | Tam: {item.tamanho}</small></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontWeight: 'bold' }}>{item.total_faturado.toFixed(2)}€</span><button onClick={() => removerDoLoteTemporario(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button></div>
              </div>
            ))}
          </div>
        )}
        {listaExpedicao.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}><span>Faturação do Lote:</span><span style={{ color: 'var(--primary-color)' }}>{listaExpedicao.reduce((sum, item) => sum + item.total_faturado, 0).toFixed(2)}€</span></div>
            <button onClick={finalizarExpedicao} style={{...btnPrimary, backgroundColor: '#22c55e'}}>💾 Registar e Finalizar Lote</button>
          </div>
        )}
      </div>
    );
  }

  if (ecraAtual === 'scanner') {
    return (
      <div style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Ler Peça</h2>
        <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--primary-color)', backgroundColor: 'black' }}>
          {!pausarCamara ? <Scanner onScan={processarLeituraScanner} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-color)', color: 'var(--primary-color)' }}>A processar...</div>}
        </div>
        <button onClick={() => setEcraAtual('resumo_expedicao')} style={{...btnSecondary, marginTop: '20px'}}>Cancelar Leitura</button>
      </div>
    );
  }

  if (ecraAtual === 'formulario_saida') {
    return (
      <div style={{ animation: 'fadeIn 0.3s' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Detalhes da Peça</h2>
        <form onSubmit={adicionarAoLote} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Artigo</label>
            {modoSaida === 'scanner' && artigoSelecionado ? (
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--primary-color)', color: 'white' }}>{artigoSelecionado.codigo} - {artigoSelecionado.nome}</div>
            ) : (
              <select value={artigoSelecionado?.id || ''} onChange={e => selecionarArtigoManual(parseInt(e.target.value))} required style={inputStyle}>
                <option value="" disabled>Selecione um artigo...</option>
                {artigos.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nome}</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={labelStyle}>OP n.º (Ordem de Produção)</label>
            {modoExpedicao === 'op' ? <div style={{ padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Bloqueado à {opSelecionada}</div> : <input type="text" value={formOP} onChange={e => setFormOP(e.target.value)} required placeholder="Ex: OP-001" style={inputStyle} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><label style={labelStyle}>Tamanho (Ex: Vários)</label><input type="text" value={formTamanho} onChange={e => setFormTamanho(e.target.value)} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Quantidade</label><input type="number" min="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} required style={inputStyle} /></div>
          </div>
          <button type="submit" style={btnPrimary}>➕ Adicionar ao Lote</button>
        </form>
      </div>
    );
  }

  return null;
}