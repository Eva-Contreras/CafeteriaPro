const { getPool, sql } = require('../config/sql.js');

module.exports = {

  obtenerProducto: async (id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdInventario, NombreProducto, Cantidad
        FROM cafeteriadb.inventario
        WHERE IdInventario = @id
      `);
    return result.recordset[0] || null;
  },

  actualizarProducto: async (id, cantidad) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('cantidad', sql.Decimal(10, 3), cantidad)
      .input('id', sql.Int, id)
      .query(`
        UPDATE cafeteriadb.inventario
        SET Cantidad = @cantidad
        WHERE IdInventario = @id
      `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('No se pudo actualizar - ninguna fila afectada');
    }

    const updated = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdInventario, NombreProducto, Cantidad
        FROM cafeteriadb.inventario
        WHERE IdInventario = @id
      `);

    return updated.recordset[0];
  },

  obtenerProductosPorCategoria: async (idCategoria) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('idCategoria', sql.Int, idCategoria)
      .query(`
        SELECT
          i.IdInventario, i.NombreProducto, i.Cantidad, i.ImagenUrl, c.Nombre as Categoria
        FROM cafeteriadb.inventario i
        JOIN cafeteriadb.categorias_inventario c ON i.IdCategoriaInventario = c.IdCategoriaInventario
        WHERE i.IdCategoriaInventario = @idCategoria
        ORDER BY i.NombreProducto
      `);
    return result.recordset;
  },

  obtenerCategorias: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT IdCategoriaInventario, Nombre, Descripcion
      FROM cafeteriadb.categorias_inventario
      ORDER BY Nombre
    `);
    return result.recordset;
  },

  crearProducto: async ({ IdCategoriaInventario, NombreProducto, Cantidad, ImagenUrl }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('IdCategoriaInventario', sql.Int, IdCategoriaInventario)
      .input('NombreProducto', sql.NVarChar, NombreProducto)
      .input('Cantidad', sql.Decimal(10, 3), Cantidad)
      .input('ImagenUrl', sql.NVarChar, ImagenUrl || null)
      .query(`
        INSERT INTO cafeteriadb.inventario (IdCategoriaInventario, NombreProducto, Cantidad, ImagenUrl)
        OUTPUT INSERTED.IdInventario
        VALUES (@IdCategoriaInventario, @NombreProducto, @Cantidad, @ImagenUrl)
      `);
    return result.recordset[0].IdInventario;
  },

  eliminarProducto: async (id) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      
      // 1. Eliminar referencias del producto en recetas
      await request
        .input('id', sql.Int, id)
        .query('DELETE FROM cafeteriadb.recetas WHERE IdInventario = @id');

      // 2. Eliminar el producto de la tabla inventario
      const deleteResult = await request.query('DELETE FROM cafeteriadb.inventario WHERE IdInventario = @id');

      if (deleteResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Producto no encontrado en inventario');
      }

      await transaction.commit();
      return true;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  obtenerStatusDB: async () => {
    const pool = await getPool();
    await pool.request().query('SELECT 1 as test');

    const tablaInv = await pool.request().query(`
      SELECT COUNT(*) as existe
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'cafeteriadb' AND TABLE_NAME = 'inventario'
    `);

    const tablaCat = await pool.request().query(`
      SELECT COUNT(*) as existe
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'cafeteriadb' AND TABLE_NAME = 'categorias_inventario'
    `);

    const conteo = await pool.request()
      .query('SELECT COUNT(*) as total FROM cafeteriadb.inventario');

    return {
      database: 'conectado',
      tablas: {
        inventario: tablaInv.recordset[0].existe > 0,
        categorias_inventario: tablaCat.recordset[0].existe > 0
      },
      total_productos: conteo.recordset[0].total
    };
  },

  obtenerInventarioCompleto: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM cafeteriadb.vw_inventario_completo
      ORDER BY Categoria, Nombre
    `);
    return result.recordset;
  },

  obtenerStockCritico: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM cafeteriadb.vw_stock_critico
      ORDER BY Cantidad ASC
    `);
    return result.recordset;
  },

  obtenerStockBajo: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        i.IdInventario as ID,
        i.NombreProducto as Nombre,
        c.Nombre as Categoria,
        i.Cantidad as Cantidad,
        CASE
          WHEN i.Cantidad <= 2 THEN 'CRÍTICO'
          WHEN i.Cantidad <= 5 THEN 'BAJO'
          ELSE 'NORMAL'
        END as Estado
      FROM cafeteriadb.inventario i
      JOIN cafeteriadb.categorias_inventario c ON i.IdCategoriaInventario = c.IdCategoriaInventario
      WHERE i.Cantidad < 5
      ORDER BY i.Cantidad ASC
    `);
    return result.recordset;
  }

};
