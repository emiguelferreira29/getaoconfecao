import type { Subcontrato } from '../App';

type Props = {
  subcontratos: Subcontrato[];
};

export default function Subcontratos({ subcontratos }: Props) {
  
  // Agrupar os subcontratos pelo nome de quem está a fazer o trabalho
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

    // Ordenar por ordem alfabética do nome do subcontratado
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
              
              {/* CABEÇALHO DO SUBCONTRATADO */}
              <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#eab308', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🤝 {grupo.nome}
                </h3>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{grupo.totalPecas} un.</strong>
                  <small style={{ color: 'var(--text-secondary)' }}>{grupo.totalCusto.toFixed(2)}€</small>
                </div>
              </div>

              {/* LISTA DE OPs E ARTIGOS QUE ESTÃO LÁ */}
              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grupo.itens.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    <div>
                      <strong style={{ color: '#3b82f6', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>
                        OP: {item.op_numero}
                      </strong>
                      <span style={{ color: 'var(--text-primary)' }}>{item.quantidade}x {item.artigo_nome}</span>
                      <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Data de envio: {new Date(item.data).toLocaleDateString('pt-PT')}
                      </small>
                    </div>
                    <strong style={{ color: '#ef4444' }}>{Number(item.custo_total).toFixed(2)}€</strong>
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