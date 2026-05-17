const { getPool, sql } = require('../config/db');

const getMenu = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.IdProducto, p.Nombre, p.Descripcion, p.Precio, p.Stock, p.ImagenUrl, c.Nombre as Categoria 
      FROM cafeteriadb.Productos p
      JOIN cafeteriadb.Categorias c ON p.IdCategoria = c.IdCategoria
      ORDER BY c.Nombre, p.Nombre
    `);

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al obtener el menú:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener el menú' });
  }
};

const getCategorias = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM cafeteriadb.Categorias');

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

module.exports = { getMenu, getCategorias };