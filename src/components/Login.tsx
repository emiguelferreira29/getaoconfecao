import React, { useState } from 'react';

type LoginProps = {
  onLogin: (user: string, pass: string) => void;
};

export default function Login({ onLogin }: LoginProps) {
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginUser, loginPass);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', backgroundColor: 'var(--bg-color)', animation: 'fadeIn 0.5s' }}>
      <img src="/logo.png" alt="Logótipo" style={{ width: '130px', height: '130px', objectFit: 'contain', borderRadius: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
      <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '30px' }}>Bem-vindo</h2>
      
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={labelStyle}>Utilizador</label>
          <input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Palavra-passe</label>
          <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
        </div>
        <button type="submit" style={{ ...btnPrimary, marginTop: '10px' }}>Entrar</button>
      </form>
    </div>
  );
}

// Estilos necessários apenas para o Login
const btnPrimary: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' };