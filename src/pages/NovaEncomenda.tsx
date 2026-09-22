import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { supabase } from '../supabase';
import { btnPrimary, btnSecondary, inputStyle, labelStyle } from '../components/Modais';
import type { Artigo } from '../App';

type ItemNovaOp = { artigo: Artigo; quantidade: number; };

type Props = {
  artigos: Artigo[];
  setEcraAtual: (ecra: any) => void;
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
};

export default function NovaEncomenda({ artigos, setEcraAtual, carregarDados, mostrarAlerta }: Props) {
  const [novaOpNumero, setNovaOpNumero] = useState('');
  const [novaOpClienteFinal, setNovaOpClienteFinal] = useState('');
  const [novaOpDataEntrega, setNovaOpDataEntrega] = useState('');
  const [novaOpLista, setNovaOpLista] = useState<ItemNovaOp[]>([]);
  const [novaOpArtigo, setNovaOpArtigo] = useState<Artigo | null>(null);
  const [novaOpQtd, setNovaOpQtd] = useState('');
  
  const [aLerDocumento, setALerDocumento] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!novaOpLista || novaOpLista.length === 0) return mostrarAlerta('Atenção', 'Adicione pelo menos um artigo à OP.', 'aviso');
    
    const dadosParaInserir = novaOpLista.map(item => ({ 
      op_numero: novaOpNumero, 
      cliente_final: novaOpClienteFinal ? novaOpClienteFinal : null,
      artigo_codigo: item.artigo.codigo, 
      artigo_nome: item.artigo.nome, 
      quantidade_pedida: item.quantidade, 
      data_entrega: novaOpDataEntrega ? novaOpDataEntrega : null 
    }));
    
    const { error } = await supabase.from('encomendas').insert(dadosParaInserir);
    
    if (error) {
      mostrarAlerta('Erro', error.message, 'erro');
    } else { 
      mostrarAlerta('Sucesso', `A ${novaOpNumero} foi registada com sucesso!`, 'sucesso'); 
      setNovaOpNumero(''); setNovaOpClienteFinal(''); setNovaOpDataEntrega(''); setNovaOpLista([]); 
      carregarDados(); 
      setEcraAtual('home'); 
    }
  };

  const handleTirarFoto = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  // --- 1. FUNÇÃO DE PRÉ-PROCESSAMENTO (FILTRO DE SCANNER) ---
  const otimizarImagemParaOCR = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Aplica Preto & Branco (grayscale), tira brilho excessivo e duplica o contraste!
            ctx.filter = 'grayscale(100%) contrast(200%) brightness(110%)';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.9)); // Devolve um JPEG de alta qualidade otimizado
          } else {
            resolve(event.target?.result as string); // Fallback caso o canvas falhe
          }
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setALerDocumento(true);
    try {
      // Passar a imagem pelo nosso "Filtro" antes de dar ao Tesseract
      const imagemOtimizadaBase64 = await otimizarImagemParaOCR(file);
      
      const result = await Tesseract.recognize(imagemOtimizadaBase64, 'por');
      analisarTextoInteligente(result.data.text);
    } catch (error) {
      console.error(error);
      mostrarAlerta('Erro de Leitura', 'Não foi possível analisar a imagem. Tente tirar uma foto mais nítida.', 'erro');
    } finally {
      setALerDocumento(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- 2. REGEX MAIS TOLERANTES E INTELIGENTES ---
  const analisarTextoInteligente = (texto: string) => {
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let possivelOP = '';
    let clientePossivel = '';
    let somaQuantidades = 0;

    // Procura OP tolerando gralhas (0 em vez de O, espacos a mais, etc)
    const matchOp = texto.match(/(?:[O0]RDEM|0RDEM)\s+DE\s+PRODU[CÇQ][AÃ]O[:\s]*([A-Z0-9.-]+)/i) || texto.match(/(?:OP|0P)[-\s]?([A-Z0-9.-]+)/i);
    if (matchOp) possivelOP = matchOp[1];

    // Procurar Cliente tolerando gralhas (C1iente, Cllente, etc)
    const matchCliente = texto.match(/C[l1i]+ente[:\s]*(.+)/i);
    if (matchCliente) clientePossivel = matchCliente[1].trim();

    // Somar as quantidades (Linhas que comecem por número, com espaços e "TA" de TAM/TAW/TAN)
    linhas.forEach(linha => {
      // Aceita coisas como "6 TAM-M", "6  TAW-M", "14 TAN-L"
      const matchQtdLinha = linha.match(/^\s*(\d+)\s*T[A-Z]/i);
      if (matchQtdLinha) {
        somaQuantidades += parseInt(matchQtdLinha[1]);
      }
    });

    if (possivelOP) setNovaOpNumero(possivelOP);
    if (clientePossivel) setNovaOpClienteFinal(clientePossivel);
    
    if (somaQuantidades > 0) {
      setNovaOpQtd(somaQuantidades.toString());
      mostrarAlerta(
        'Leitura Concluída', 
        `Foram detetados a OP "${possivelOP || 'Desconhecida'}", o Cliente "${clientePossivel || 'Desconhecido'}" e um total de ${somaQuantidades} peças.\n\nEscolha o Artigo correspondente na lista abaixo e clique em Adicionar.`, 
        'sucesso'
      );
    } else {
      mostrarAlerta('Aviso', 'A OP e o Cliente podem ter sido lidos, mas não detetámos as quantidades de forma segura. Valide os dados e insira a quantidade manualmente.', 'aviso');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Nova Encomenda (Entrada)</h2>
      
      <div style={{ marginBottom: '25px', backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', border: '1px solid var(--primary-color)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🤖</span> Leitura Automática (OCR)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Tire uma foto à folha de obra. O sistema extrai a OP, o Cliente Final e as peças totais.</p>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={processarImagem} style={{ display: 'none' }} />
        <button onClick={handleTirarFoto} style={{...btnSecondary, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', backgroundColor: aLerDocumento ? 'var(--bg-color)' : 'transparent'}} disabled={aLerDocumento}>
          {aLerDocumento ? <span style={{ color: 'var(--primary-color)' }}>A analisar papel (pode demorar)... ⏳</span> : <>📷 Tirar Foto ao Documento</>}
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>Número da OP</label>
        <input type="text" value={novaOpNumero} onChange={e => setNovaOpNumero(e.target.value)} required style={inputStyle} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>Cliente / Referência (Opcional)</label>
        <input type="text" value={novaOpClienteFinal} onChange={e => setNovaOpClienteFinal(e.target.value)} placeholder="Ex: FC Pedroso" style={inputStyle} />
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={labelStyle}>Data de Entrega Limite (Opcional)</label>
        <input type="date" value={novaOpDataEntrega} onChange={e => setNovaOpDataEntrega(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ backgroundColor: 'var(--surface-color)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Adicionar Material</h3>
        <form onSubmit={adicionarItemNovaOp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select value={novaOpArtigo?.id || ''} onChange={e => setNovaOpArtigo(artigos.find(a => a.id === parseInt(e.target.value)) || null)} style={inputStyle}>
            <option value="" disabled>Escolha o artigo...</option>
            {artigos.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nome}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" min="1" placeholder="Quantidade" value={novaOpQtd} onChange={e => setNovaOpQtd(e.target.value)} style={{...inputStyle, flex: 1}} />
            <button type="submit" style={{...btnPrimary, width: 'auto', padding: '0 20px'}}>Adicionar</button>
          </div>
        </form>
      </div>

      <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Lista da OP ({novaOpLista.length})</h3>
      {novaOpLista.map((item, i) => (
        <div key={i} style={{ backgroundColor: 'var(--surface-color)', padding: '12px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div><strong style={{ display: 'block', fontSize: '1rem', color: 'var(--primary-color)' }}>{item.quantidade}x</strong><span>{item.artigo.nome}</span></div>
          <button onClick={() => setNovaOpLista(novaOpLista.filter((_, index) => index !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
      ))}

      {novaOpLista.length > 0 && <button onClick={guardarNovaEncomenda} style={{...btnPrimary, marginTop: '20px', backgroundColor: '#8b5cf6'}}>💾 Guardar OP Completa</button>}
    </div>
  );
}