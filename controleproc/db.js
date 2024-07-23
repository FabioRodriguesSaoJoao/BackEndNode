import pkg from 'pg'; 
const { Pool } = pkg; 

const pool = new Pool({
// adicione as credenciais do seu banco de dados
});

export default pool;
