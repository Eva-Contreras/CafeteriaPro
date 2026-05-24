const { getPool, sql } = require('../config/db');

const getProducto = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdInventario, NombreProducto, Cantidad
        FROM cafeteriadb.inventario
        WHERE IdInventario = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json({ success: true, producto: result.recordset[0] });

  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  if (cantidad === undefined) {
    return res.status(400).json({ success: false, message: 'Datos incompletos: cantidad es requerida' });
  }

  const nuevaCantidad = parseFloat(cantidad);
  if (isNaN(nuevaCantidad)) {
    return res.status(400).json({ success: false, message: 'Dato inválido: cantidad debe ser un número' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('cantidad', sql.Decimal(10, 3), nuevaCantidad)
      .input('id', sql.Int, id)
      .query(`
        UPDATE cafeteriadb.inventario
        SET Cantidad = @cantidad
        WHERE IdInventario = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'No se pudo actualizar - ninguna fila afectada' });
    }

    const updated = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdInventario, NombreProducto, Cantidad
        FROM cafeteriadb.inventario
        WHERE IdInventario = @id
      `);

    res.json({
      success: true,
      message: 'Producto actualizado correctamente',
      cantidad_actualizada: nuevaCantidad,
      producto: {
        id: updated.recordset[0].IdInventario,
        nombre: updated.recordset[0].NombreProducto,
        cantidad: updated.recordset[0].Cantidad
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor: ' + error.message });
  }
};

const getProductosPorCategoria = async (req, res) => {
  const { idCategoria } = req.params;

  try {
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

    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error al obtener productos por categoría:', error);
    res.status(500).json({ error: 'Error al obtener productos', detalles: error.message });
  }
};

const getCategorias = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT IdCategoriaInventario, Nombre, Descripcion
      FROM cafeteriadb.categorias_inventario
      ORDER BY Nombre
    `);

    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías', detalles: error.message });
  }
};

const crearProducto = async (req, res) => {
  const { IdCategoriaInventario, NombreProducto, Cantidad, ImagenUrl } = req.body;

  const stock = parseFloat(Cantidad);
  if (isNaN(stock) || stock <= 0) {
    return res.status(400).json({ success: false, message: 'La cantidad inicial de stock debe ser mayor a 0' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('IdCategoriaInventario', sql.Int, IdCategoriaInventario)
      .input('NombreProducto', sql.NVarChar, NombreProducto)
      .input('Cantidad', sql.Decimal(10, 3), stock)
      .input('ImagenUrl', sql.NVarChar, ImagenUrl || null)
      .query(`
        INSERT INTO cafeteriadb.inventario (IdCategoriaInventario, NombreProducto, Cantidad, ImagenUrl)
        OUTPUT INSERTED.IdInventario
        VALUES (@IdCategoriaInventario, @NombreProducto, @Cantidad, @ImagenUrl)
      `);

    res.status(201).json({
      success: true,
      message: 'Producto creado correctamente',
      id: result.recordset[0].IdInventario
    });

  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ success: false, message: 'Error al crear producto: ' + error.message });
  }
};

const eliminarProducto = async (req, res) => {
  const { id } = req.params;

  try {
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
        return res.status(404).json({ success: false, message: 'Producto no encontrado en inventario' });
      }

      await transaction.commit();
      res.json({ success: true, message: 'Producto eliminado correctamente' });

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar producto: ' + error.message });
  }
};

const getStatus = async (req, res) => {
  try {
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

    res.json({
      status: 'ok',
      database: 'conectado',
      tablas: {
        inventario: tablaInv.recordset[0].existe > 0,
        categorias_inventario: tablaCat.recordset[0].existe > 0
      },
      total_productos: conteo.recordset[0].total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en endpoint de status:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
};

const getInventarioCompleto = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM cafeteriadb.vw_inventario_completo
      ORDER BY Categoria, Nombre
    `);

    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error al cargar vista de inventario completo:', error);

    if (error.message.includes('vw_inventario_completo')) {
      return res.status(404).json({
        success: false,
        message: 'La vista vw_inventario_completo no existe.',
        error: error.message
      });
    }

    res.status(500).json({ success: false, message: 'Error al cargar el inventario completo', error: error.message });
  }
};

const getStockCritico = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM cafeteriadb.vw_stock_critico
      ORDER BY Cantidad ASC
    `);

    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error al cargar vista de stock crítico:', error);

    if (error.message.includes('vw_stock_critico')) {
      return res.status(404).json({
        success: false,
        message: 'La vista vw_stock_critico no existe.',
        error: error.message
      });
    }

    res.status(500).json({ success: false, message: 'Error al cargar el stock crítico', error: error.message });
  }
};

const getStockBajo = async (req, res) => {
  try {
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

    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error al obtener stock bajo:', error);
    res.status(500).json({ success: false, message: 'Error al obtener productos con stock bajo', error: error.message });
  }
};

module.exports = {
  getProducto,
  actualizarProducto,
  getProductosPorCategoria,
  getCategorias,
  crearProducto,
  eliminarProducto,
  getStatus,
  getInventarioCompleto,
  getStockCritico,
  getStockBajo
};