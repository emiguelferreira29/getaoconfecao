import React, { useState } from 'react';
import { btnPrimary, inputStyle, labelStyle } from './Modais';

type Props = {
  onLogin: (user: string, pass: string) => void;
};

export default function Login({ onLogin }: Props) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(user, pass);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', backgroundColor: 'var(--bg-color)' }}>
      <div style={{ backgroundColor: 'var(--surface-color)', padding: '40px 30px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.5s' }}>
        
        {/* LOGÓTIPO MAIOR E DESTACADO */}
        <img src="/logo.png" alt="Logótipo M&J Confeção" style={{ width: '160px', height: '160px', objectFit: 'contain', marginBottom: '30px', borderRadius: '16px' }} />
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '25px', color: 'var(--text-primary)', textAlign: 'center' }}>Iniciar Sessão</h2>
        
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Utilizador</label>
            <input type="text" value={user} onChange={e => setUser(e.target.value)} style={{ ...inputStyle, padding: '12px' }} required />
          </div>
          <div>
            <label style={labelStyle}>Palavra-passe</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} style={{ ...inputStyle, padding: '12px' }} required />
          </div>
          
          <button type="submit" style={{ ...btnPrimary, marginTop: '10px', padding: '15px', fontSize: '1.1rem', borderRadius: '12px', width: '100%' }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}