import React from 'react';

// Tipos para as props dos Modais
export type TipoModalConfirmacao = 'saida' | 'artigo' | 'logout' | 'cancelar_lote' | 'lote_inteiro' | 'encomenda_inteira' | null;

type ModalAlertaProps = {
  visivel: boolean;
  titulo: string;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'aviso';
  onFechar: () => void;
};

type ModalConfirmacaoProps = {
  aberto: boolean;
  tipo: TipoModalConfirmacao;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ModalAlerta({ visivel, titulo, mensagem, tipo, onFechar }: ModalAlertaProps) {
  if (!visivel) return null;

  return (
    <div style={{ ...modalOverlayStyle, zIndex: 2000 }}>
      <div style={modalBoxStyle}>
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          {tipo === 'sucesso' ? '✅' : tipo === 'erro' ? '❌' : '⚠️'}
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{titulo}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4' }}>{mensagem}</p>
        <button onClick={onFechar} style={btnPrimary}>OK</button>
      </div>
    </div>
  );
}

export function ModalConfirmacao({ aberto, tipo, onCancelar, onConfirmar }: ModalConfirmacaoProps) {
  if (!aberto || !tipo) return null;

  const obterTitulo = () => {
    switch (tipo) {
      case 'logout': return 'Terminar Sessão';
      case 'cancelar_lote': return 'Cancelar Expedição';
      case 'lote_inteiro': return 'Eliminar Lote Inteiro';
      case 'encomenda_inteira': return 'Eliminar OP';
      default: return 'Confirmar Eliminação';
    }
  };

  const obterMensagem = () => {
    switch (tipo) {
      case 'logout': return 'Tem a certeza que deseja sair da sua conta?';
      case 'cancelar_lote': return 'Vai perder as peças que já adicionou a este lote. Deseja cancelar?';
      case 'lote_inteiro': return 'Tem a certeza que deseja apagar a expedição COMPLETA? Todas as peças deste lote vão ser apagadas.';
      case 'encomenda_inteira': return 'Tem a certeza que deseja apagar esta OP? Todos os artigos associados serão apagados permanentemente.';
      default: return 'Tem a certeza que deseja apagar este registo? Esta ação não pode ser desfeita.';
    }
  };

  const obterTextoBotao = () => {
    switch (tipo) {
      case 'logout': return 'Sair';
      case 'cancelar_lote': return 'Descartar';
      default: return 'Apagar';
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalBoxStyle}>
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          {tipo === 'logout' ? '🚪' : tipo === 'cancelar_lote' ? '🛑' : '⚠️'}
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          {obterTitulo()}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4' }}>
          {obterMensagem()}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancelar} style={{ ...btnSecondary, padding: '12px', flex: 1 }}>Voltar</button>
          <button 
            onClick={onConfirmar} 
            style={{ 
              ...btnPrimary, 
              backgroundColor: tipo === 'logout' ? 'var(--primary-color)' : '#ef4444', 
              padding: '12px', 
              flex: 1 
            }}
          >
            {obterTextoBotao()}
          </button>
        </div>
      </div>
    </div>
  );
}

// Estilos Partilhados dos Modais
export const btnPrimary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
export const btnSecondary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '2px solid var(--border-color)', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
export const btnCard: React.CSSProperties = { backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', height: '100%' };
export const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', boxSizing: 'border-box' };
export const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' };
export const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
export const modalBoxStyle: React.CSSProperties = { backgroundColor: 'var(--surface-color)', padding: '25px', borderRadius: '16px', width: '85%', maxWidth: '350px', textAlign: 'center', border: '1px solid var(--border-color)', animation: 'modalFadeIn 0.2s ease-out' };