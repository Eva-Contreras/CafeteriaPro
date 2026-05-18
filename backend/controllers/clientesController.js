const { getPool, sql } = require('../config/db');

const buscarClientes = async (req, res) => {
  const { nombre } = req.query;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('nombre', sql.NVarChar, `%${nombre}%`)
      .query(`
        SELECT * FROM cafeteriadb.Clientes 
        WHERE Nombre LIKE @nombre
      `);

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al buscar cliente:', error);
    res.status(500).json({ error: 'Error al buscar cliente' });
  }
};

const crearCliente = async (req, res) => {
  const { nombre, email } = req.body;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email',  sql.NVarChar, email || null)
      .query(`
        INSERT INTO cafeteriadb.Clientes (Nombre, Email)
        OUTPUT INSERTED.IdCliente
        VALUES (@nombre, @email)
      `);

    res.json({
      success: true,
      id:      result.recordset[0].IdCliente,
      nombre
    });

  } catch (error) {
    console.error('Error al registrar cliente:', error);
    if (error.message && error.message.includes('UNIQUE KEY constraint')) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado. Usa otro o busca el cliente.' });
    }
    res.status(500).json({ success: false, message: 'Error interno al registrar cliente' });
  }
};

module.exports = { buscarClientes, crearCliente };