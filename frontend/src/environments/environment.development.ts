// Configurações do ambiente - Barbearia do Além
export const environment = {
  production: false,
  apiUrl: 'https://projetobarbeariadoalem-o-3.onrender.com/api',
  
  // Configurações padrão do sistema
  defaultCredentials: {
    email: 'admin@barbeariadoalem.com',
    password: 'admin123'
  },
  
  // URLs importantes
  urls: {
    backend: 'https://projetobarbeariadoalem-o-3.onrender.com',
    frontend: 'https://jardelzito87.github.io/Site_completo_Barbeariadoalem',
    login: 'https://jardelzito87.github.io/Site_completo_Barbeariadoalem/login',
    admin: 'https://jardelzito87.github.io/Site_completo_Barbeariadoalem/admin'
  },
  
  // Configurações de banco
  database: {
    name: 'barbeariadoalem_db',
    provider: 'Neon PostgreSQL'
  },
  
};
