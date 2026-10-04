import { supabase } from '../supabase';
import type { Subcontrato } from '../App';

type Props = {
  subcontratos: Subcontrato[];
  carregarDados: () => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo: 'sucesso'|'erro'|'aviso') => void;
};

export default function Subcontratos({ subcontratos, carregarDados, mostrarAlerta }: Props) {
  
  // Função para apagar subcontrato individual da lista
  const apagarSubcontrato = async (id: number, artigo: string, op: string) => {
    if (!window.confirm(`Tem a certeza que deseja anular a subcontratação de ${artigo} da OP ${op}?`)) return;
    
    const { error } = await supabase.from('subcontratos').delete().eq('id', id);
    
    if (error) {
      mostrarAlerta('Erro', error.message, 'erro');
    } else {
      mostrarAlerta('Sucesso', 'Registo de subcontratação anulado.', 'sucesso');
      carregarDados();
    }
  };

  const agruparPorSubcontratado = () => {
    const grupos: Record<string, { nome: string; itens: Subcontrato[]; totalPecas: number; totalCusto: number }> = {};
    
    subcontratos.forEach(sub => {
      const nome = sub.subcontratado_a?.trim() || 'Não Especificado (Sem Nome)';
      
      if (!grupos[nome]) {
        grupos[nome] = { nome, itens: [], totalPecas: 0, totalCusto: 0 };
      }
      
      grupos[nome].itens.push(sub);
      grupos[nome].totalPecas += Number(sub.quantidade);
      grupos[nome].totalCusto += Number(sub.custo_total);
    });

    return Object.values(grupos).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const dados = agruparPorSubcontratado();

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Artigos Subcontratados</h2>
      
      {dados.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>Não existem registos de artigos em subcontratação.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {dados.map(grupo => (
            <div key={grupo.nome} style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              
              <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#eab308', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🤝 {grupo.nome}
                </h3>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{grupo.totalPecas} un.</strong>
                  <small style={{ color: 'var(--text-secondary)' }}>{grupo.totalCusto.toFixed(2)}€</small>
                </div>
              </div>

              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grupo.itens.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#3b82f6', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>
                        OP: {item.op_numero}
                      </strong>
                      <span style={{ color: 'var(--text-primary)' }}>{item.quantidade}x {item.artigo_nome}</span>
                      <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Data de envio: {new Date(item.data).toLocaleDateString('pt-PT')}
                      </small>
                    </div>
                    
                    {/* ZONA DE CUSTO E APAGAR */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <strong style={{ color: '#ef4444' }}>{Number(item.custo_total).toFixed(2)}€</strong>
                      <button 
                        onClick={() => apagarSubcontrato(item.id, item.artigo_nome, item.op_numero)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', padding: '5px' }}
                        title="Anular Subcontratação"
                      >
                        🗑️
                      </button>
                    </div>
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