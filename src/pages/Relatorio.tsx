import { btnPrimary, btnSecondary } from '../components/Modais';
import type { Saida } from '../App';

type Props = {
  saidas: Saida[];
  agruparSaidas: () => any[];
  gerarPDF: (grupo: any, comPrecos: boolean) => void;
  pedirConfirmacaoApagarLoteInteiro: (lote_id: string) => void;
  pedirConfirmacaoApagar: (id: number, tipo: 'saida' | 'artigo') => void;
};

export default function Relatorio({ saidas, agruparSaidas, gerarPDF, pedirConfirmacaoApagarLoteInteiro, pedirConfirmacaoApagar }: Props) {
  return (
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
                <div><strong style={{ display: 'block', color: 'var(--primary-color)' }}>{grupo.lote_id.startsWith('Expedição') ? `📦 ${grupo.lote_id}` : '📦 Registo Antigo'}</strong><small style={{ color: 'var(--text-secondary)' }}>{new Date(grupo.data).toLocaleString('pt-PT')}</small></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{grupo.total_faturado.toFixed(2)}€</div>{grupo.lote_id.startsWith('Expedição') && <button onClick={() => pedirConfirmacaoApagarLoteInteiro(grupo.lote_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.4rem', padding: '4px' }}>🗑️</button>}</div>
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
                    <div><strong style={{ display: 'block', fontSize: '0.95rem' }}>{saida.quantidade}x {saida.artigo_nome}</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OP: {saida.op_numero} | Tam: {saida.tamanho}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{Number(saida.total_faturado).toFixed(2)}€</span><button onClick={() => pedirConfirmacaoApagar(saida.id, 'saida')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '4px' }}>🗑️</button></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}