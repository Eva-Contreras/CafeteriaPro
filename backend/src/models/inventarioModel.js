const { getPool, sql } = require('../config/sql.js');

module.exports = {

  obtenerBebidas: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.IdProducto, p.Nombre, p.Descripcion, p.Precio, p.Stock, p.ImagenUrl
      FROM cafeteriadb.Productos p
      JOIN cafeteriadb.Categorias c ON p.IdCategoria = c.IdCategoria
      WHERE c.Nombre = 'Bebidas'
      ORDER BY p.Nombre
    `);
    return result.recordset;
  },

  actualizarStock: async (id, stock) => {
    const pool = await getPool();
    await pool.request()
      .input('stock', sql.Int, stock)
      .input('id', sql.Int, id)
      .query(`
        UPDATE cafeteriadb.Productos
        SET Stock = @stock
        WHERE IdProducto = @id
      `);
  },

  crearProducto: async ({ Nombre, Descripcion, Precio, Stock, IdCategoria, Imagen }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion)
      .input('Precio', sql.Decimal(10, 2), Precio)
      .input('Stock', sql.Int, Stock)
      .input('IdCategoria', sql.Int, IdCategoria)
      .input('Imagen', sql.NVarChar, Imagen || null)
      .query(`
        INSERT INTO cafeteriadb.Productos (Nombre, Descripcion, Precio, Stock, IdCategoria, ImagenUrl)
        OUTPUT INSERTED.IdProducto
        VALUES (@Nombre, @Descripcion, @Precio, @Stock, @IdCategoria, @Imagen)
      `);
    return result.recordset[0].IdProducto;
  },

  obtenerInsumos: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT IdInventario, NombreProducto 
      FROM cafeteriadb.inventario 
      ORDER BY NombreProducto
    `);
    return result.recordset;
  },

  crearNuevoInsumo: async ({ nombre, categoria, cantidad, imagen }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('IdCategoriaInventario', sql.Int, categoria)
      .input('NombreProducto', sql.NVarChar, nombre)
      .input('Cantidad', sql.Decimal(10, 3), cantidad || 0)
      .input('ImagenUrl', sql.NVarChar, imagen || null)
      .query(`
        INSERT INTO cafeteriadb.inventario (IdCategoriaInventario, NombreProducto, Cantidad, ImagenUrl)
        OUTPUT INSERTED.IdInventario
        VALUES (@IdCategoriaInventario, @NombreProducto, @Cantidad, @ImagenUrl)
      `);
    return result.recordset[0].IdInventario;
  },

  crearProductoConReceta: async ({ Nombre, Descripcion, Precio, Stock, IdCategoria, Imagen, Receta }) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Insertar el producto
      const requestProducto = new sql.Request(transaction);
      const resultProducto = await requestProducto
        .input('Nombre', sql.NVarChar, Nombre)
        .input('Descripcion', sql.NVarChar, Descripcion)
        .input('Precio', sql.Decimal(10, 2), Precio)
        .input('Stock', sql.Int, Stock)
        .input('IdCategoria', sql.Int, IdCategoria)
        .input('Imagen', sql.NVarChar, Imagen || null)
        .query(`
          INSERT INTO cafeteriadb.Productos (Nombre, Descripcion, Precio, Stock, IdCategoria, ImagenUrl)
          OUTPUT INSERTED.IdProducto
          VALUES (@Nombre, @Descripcion, @Precio, @Stock, @IdCategoria, @Imagen)
        `);

      const idProducto = resultProducto.recordset[0].IdProducto;

      // 2. Insertar la receta
      if (Receta && Array.isArray(Receta) && Receta.length > 0) {
        for (const ingrediente of Receta) {
          const requestReceta = new sql.Request(transaction);
          await requestReceta
            .input('IdProducto', sql.Int, idProducto)
            .input('IdInventario', sql.Int, ingrediente.IdInventario)
            .input('CantidadInsumo', sql.Decimal(10, 3), ingrediente.CantidadInsumo)
            .query(`
              INSERT INTO cafeteriadb.recetas (IdProducto, IdInventario, CantidadInsumo)
              VALUES (@IdProducto, @IdInventario, @CantidadInsumo)
            `);
        }
      }

      await transaction.commit();
      return idProducto;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  obtenerReceta: async (idProducto) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('IdProducto', sql.Int, idProducto)
      .query(`
        SELECT r.IdInventario, r.CantidadInsumo, i.NombreProducto 
        FROM cafeteriadb.recetas r
        JOIN cafeteriadb.inventario i ON r.IdInventario = i.IdInventario
        WHERE r.IdProducto = @IdProducto
        ORDER BY i.NombreProducto
      `);
    return result.recordset;
  },

  actualizarReceta: async (idProducto, receta) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const requestDelete = new sql.Request(transaction);
      await requestDelete
        .input('IdProducto', sql.Int, idProducto)
        .query('DELETE FROM cafeteriadb.recetas WHERE IdProducto = @IdProducto');

      if (receta && Array.isArray(receta) && receta.length > 0) {
        for (const ingrediente of receta) {
          const requestInsert = new sql.Request(transaction);
          await requestInsert
            .input('IdProducto', sql.Int, idProducto)
            .input('IdInventario', sql.Int, ingrediente.IdInventario)
            .input('CantidadInsumo', sql.Decimal(10, 3), ingrediente.CantidadInsumo)
            .query(`
              INSERT INTO cafeteriadb.recetas (IdProducto, IdInventario, CantidadInsumo)
              VALUES (@IdProducto, @IdInventario, @CantidadInsumo)
            `);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

};
