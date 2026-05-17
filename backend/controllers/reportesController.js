const { getPool, sql } = require('../config/db');

const getTopProductos = async (req, res) => {
  const { inicio, fin } = req.body;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('fecha_inicio', sql.Date, inicio)
      .input('fecha_fin',    sql.Date, fin)
      .execute('cafeteriadb.sp_top_productos');

    res.json(result.recordset);

  } catch (error) {
    console.error('Error en reporte top:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
};

module.exports = { getTopProductos };