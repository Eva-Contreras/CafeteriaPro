
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkSchema() {
  let pool;

  try {
    pool = await sql.connect(config);
    console.log('✅ Conexión exitosa\n');

    console.log('--- COLUMNAS EN Productos ---');
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'cafeteriadb' AND TABLE_NAME = 'productos'
    `);
    console.log(columns.recordset.map(c => c.COLUMN_NAME).join(', '));

    console.log('\n--- CATEGORÍAS ---');
    const categories = await pool.request()
      .query('SELECT * FROM cafeteriadb.categorias');
    console.log(categories.recordset);

    console.log('\n--- TABLAS EN LA BASE DE DATOS ---');
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'cafeteriadb'
    `);
    console.log(tables.recordset.map(t => t.TABLE_NAME).join(', '));

  } catch (error) {
    console.error('❌ Error al verificar esquema:', error.message);
  } finally {
    if (pool) await sql.close();
  }
}

checkSchema();