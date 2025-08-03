const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  pool: pool,
  query: (text, params) => pool.query(text, params),
  testConnection: async () => {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (err) {
      return false;
    }
  }
};
