const { getPool, sql } = require('../config/sql.js');

module.exports = {

  obtenerPedidosPendientes: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        p.IdPedido,
        c.Nombre AS NombreCliente,
        p.Fecha,
        p.Total,
        ROUND(p.Total / 1.16, 2) as Subtotal,
        cafeteriadb.CalcularIVA(ROUND(p.Total / 1.16, 2)) as IVA,
        u.Nombre AS NombreUsuario,
        p.Estado
      FROM cafeteriadb.Pedidos p
      JOIN cafeteriadb.Clientes c ON p.IdCliente = c.IdCliente
      JOIN cafeteriadb.Usuarios u ON p.IdUsuario = u.IdUsuario
      WHERE p.Estado = 'Pendiente'
      ORDER BY p.Fecha DESC
    `);
    return result.recordset;
  },

  obtenerPedidosCompletados: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        p.IdPedido,
        p.IdCliente,
        c.Nombre AS NombreCliente,
        p.Fecha,
        p.Total,
        u.IdUsuario,
        u.Nombre AS NombreUsuario,
        p.Estado
      FROM cafeteriadb.Pedidos p
      JOIN cafeteriadb.Clientes c ON p.IdCliente = c.IdCliente
      JOIN cafeteriadb.Usuarios u ON p.IdUsuario = u.IdUsuario
      WHERE p.Estado = 'Completado'
      ORDER BY p.Fecha DESC
    `);
    return result.recordset;
  },

  obtenerDetallePedido: async (id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          dp.Cantidad,
          dp.Subtotal,
          p.Nombre AS NombreProducto,
          p.Precio AS PrecioUnitario
        FROM cafeteriadb.DetallePedidos dp
        JOIN cafeteriadb.Productos p ON dp.IdProducto = p.IdProducto
        WHERE dp.IdPedido = @id
      `);
    return result.recordset;
  },

  obtenerClientePedido: async (id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT c.Nombre, c.Email
        FROM cafeteriadb.Pedidos p
        JOIN cafeteriadb.Clientes c ON p.IdCliente = c.IdCliente
        WHERE p.IdPedido = @id
      `);
    return result.recordset[0] || null;
  },

  completarPedido: async (id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE cafeteriadb.Pedidos 
        SET Estado = 'Completado' 
        WHERE IdPedido = @id
      `);
    return result.rowsAffected[0];
  },

  obtenerTiposLeche: async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT IdLeche, Nombre FROM cafeteriadb.TiposLeche ORDER BY Nombre');
    return result.recordset;
  },

  crearPedido: async ({ idCliente, total, idUsuario, productos }) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const ivaResult = await transaction.request()
        .input('total', sql.Decimal(10, 2), total)
        .query('SELECT cafeteriadb.CalcularIVA(@total) as iva');

      const iva = parseFloat(ivaResult.recordset[0].iva);
      const totalConIVA = parseFloat((parseFloat(total) + iva).toFixed(2));

      const pedidoResult = await transaction.request()
        .input('idCliente', sql.Int, idCliente)
        .input('totalConIVA', sql.Decimal(10, 2), totalConIVA)
        .input('idUsuario', sql.Int, idUsuario)
        .query(`
          INSERT INTO cafeteriadb.Pedidos (IdCliente, Total, IdUsuario, Estado)
          OUTPUT INSERTED.IdPedido
          VALUES (@idCliente, @totalConIVA, @idUsuario, 'Pendiente')
        `);

      const idPedido = pedidoResult.recordset[0].IdPedido;

      for (const producto of productos) {
        await transaction.request()
          .input('idPedido', sql.Int, idPedido)
          .input('idProducto', sql.Int, producto.id)
          .input('cantidad', sql.Int, producto.cantidad)
          .input('subtotal', sql.Decimal(10, 2), producto.subtotal)
          .query(`
            INSERT INTO cafeteriadb.DetallePedidos (IdPedido, IdProducto, Cantidad, Subtotal)
            VALUES (@idPedido, @idProducto, @cantidad, @subtotal)
          `);

        // Lógica de bebida personalizada
        if (producto.personalizado) {
          const { idLeche, shots } = producto.personalizado;
          const request = new sql.Request(transaction);

          // 1. Receta base
          const baseRecipeResult = await request
            .input('idProd', sql.Int, producto.id)
            .query('SELECT IdInventario, CantidadInsumo FROM cafeteriadb.recetas WHERE IdProducto = @idProd');

          // 2. Leche seleccionada
          let newMilk = null;
          if (idLeche > 0) {
            const selectedMilkResult = await request
              .input('idLeche', sql.Int, idLeche)
              .query('SELECT IdInventario, CantidadBase FROM cafeteriadb.TiposLeche WHERE IdLeche = @idLeche');
            if (selectedMilkResult.recordset.length > 0) {
              newMilk = selectedMilkResult.recordset[0];
            }
          }

          // 3. Todas las leches
          const allMilksResult = await request.query('SELECT IdInventario FROM cafeteriadb.TiposLeche');
          const allMilkInventarioIds = allMilksResult.recordset.map(m => m.IdInventario);

          // 4. Extra café
          let extraCafe = 0;
          if (shots > 0) {
            const shotsResult = await request
              .input('shotsCount', sql.Int, shots)
              .query('SELECT ExtraCafe FROM cafeteriadb.ShotsCafe WHERE CantidadShots = @shotsCount');
            if (shotsResult.recordset.length > 0) {
              extraCafe = parseFloat(shotsResult.recordset[0].ExtraCafe);
            }
          }

          const baseRecipe = baseRecipeResult.recordset;
          const originalMilkInsumo = baseRecipe.find(item => allMilkInventarioIds.includes(item.IdInventario));

          // Re-sumar la leche original (porque el trigger ya la descontó)
          if (originalMilkInsumo) {
            await request
              .input('origMilkId', sql.Int, originalMilkInsumo.IdInventario)
              .input('origMilkQty', sql.Decimal(10, 3), originalMilkInsumo.CantidadInsumo)
              .query(`
                UPDATE cafeteriadb.inventario
                SET Cantidad = Cantidad - (-@origMilkQty)
                WHERE IdInventario = @origMilkId
              `);
          }

          // Restar la leche personalizada
          if (newMilk) {
            const milkStockRes = await request
              .input('newMilkId', sql.Int, newMilk.IdInventario)
              .query('SELECT Cantidad, NombreProducto FROM cafeteriadb.inventario WHERE IdInventario = @newMilkId');
            
            if (milkStockRes.recordset.length > 0) {
              const currentStock = parseFloat(milkStockRes.recordset[0].Cantidad);
              const reqQty = parseFloat(newMilk.CantidadBase);
              const nombreP = milkStockRes.recordset[0].NombreProducto;
              if (currentStock < reqQty) {
                throw new Error(`Stock insuficiente para '${nombreP}'. Disponible: ${currentStock}, Requerido: ${reqQty}`);
              }
            }

            await request
              .input('newMilkIdDeduct', sql.Int, newMilk.IdInventario)
              .input('newMilkQtyDeduct', sql.Decimal(10, 3), newMilk.CantidadBase)
              .query(`
                UPDATE cafeteriadb.inventario
                SET Cantidad = Cantidad - @newMilkQtyDeduct
                WHERE IdInventario = @newMilkIdDeduct
              `);
          }

          // Restar extra café
          if (extraCafe > 0) {
            const coffeeResult = await request.query("SELECT IdInventario, Cantidad, NombreProducto FROM cafeteriadb.inventario WHERE NombreProducto = 'Café molido'");
            if (coffeeResult.recordset.length > 0) {
              const coffeeId = coffeeResult.recordset[0].IdInventario;
              const currentStock = parseFloat(coffeeResult.recordset[0].Cantidad);
              const nombreP = coffeeResult.recordset[0].NombreProducto;

              if (currentStock < extraCafe) {
                throw new Error(`Stock insuficiente para '${nombreP}'. Disponible: ${currentStock}, Requerido: ${extraCafe}`);
              }

              await request
                .input('coffeeIdDeduct', sql.Int, coffeeId)
                .input('coffeeQtyDeduct', sql.Decimal(10, 3), extraCafe)
                .query(`
                  UPDATE cafeteriadb.inventario
                  SET Cantidad = Cantidad - @coffeeQtyDeduct
                  WHERE IdInventario = @coffeeIdDeduct
                `);
            }
          }
        }
      }

      await transaction.commit();
      return { idPedido, totalConIVA };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  crearPedidoPersonalizado: async ({ idProducto, idLeche, shots, idCliente, idUsuario }) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // 1. Receta base
      const baseRecipeResult = await request
        .input('idProd', sql.Int, idProducto)
        .query('SELECT IdInventario, CantidadInsumo FROM cafeteriadb.recetas WHERE IdProducto = @idProd');

      // 2. Leche seleccionada
      let newMilk = null;
      if (idLeche > 0) {
        const selectedMilkResult = await request
          .input('idLeche', sql.Int, idLeche)
          .query('SELECT IdInventario, CantidadBase FROM cafeteriadb.TiposLeche WHERE IdLeche = @idLeche');

        if (selectedMilkResult.recordset.length === 0) {
          throw new Error('El tipo de leche seleccionado no existe.');
        }
        newMilk = selectedMilkResult.recordset[0];
      }

      // 3. Todas las leches
      const allMilksResult = await request.query('SELECT IdInventario FROM cafeteriadb.TiposLeche');
      const allMilkInventarioIds = allMilksResult.recordset.map(m => m.IdInventario);

      // 4. Configuración shots
      let extraCafe = 0;
      if (shots > 0) {
        const shotsResult = await request
          .input('shotsCount', sql.Int, shots)
          .query('SELECT ExtraCafe FROM cafeteriadb.ShotsCafe WHERE CantidadShots = @shotsCount');

        if (shotsResult.recordset.length === 0) {
          throw new Error('La cantidad de shots seleccionada no es válida.');
        }
        extraCafe = parseFloat(shotsResult.recordset[0].ExtraCafe);
      }

      // 5. Modificar receta en memoria
      const baseRecipe = baseRecipeResult.recordset;
      const modifiedRecipe = baseRecipe.filter(item => !allMilkInventarioIds.includes(item.IdInventario));

      if (newMilk) {
        modifiedRecipe.push({
          IdInventario: newMilk.IdInventario,
          CantidadInsumo: parseFloat(newMilk.CantidadBase)
        });
      }

      if (extraCafe > 0) {
        const coffeeResult = await request.query("SELECT IdInventario FROM cafeteriadb.inventario WHERE NombreProducto = 'Café molido'");
        if (coffeeResult.recordset.length === 0) {
          throw new Error("No se encontró el insumo 'Café molido' en el inventario.");
        }

        const coffeeId = coffeeResult.recordset[0].IdInventario;
        const coffeeIndex = modifiedRecipe.findIndex(item => item.IdInventario === coffeeId);
        if (coffeeIndex !== -1) {
          modifiedRecipe[coffeeIndex].CantidadInsumo = parseFloat(modifiedRecipe[coffeeIndex].CantidadInsumo) + extraCafe;
        } else {
          modifiedRecipe.push({
            IdInventario: coffeeId,
            CantidadInsumo: extraCafe
          });
        }
      }

      // 6. Validar stock
      for (const item of modifiedRecipe) {
        const stockResult = await request
          .input(`invId_${item.IdInventario}`, sql.Int, item.IdInventario)
          .query(`SELECT Cantidad, NombreProducto FROM cafeteriadb.inventario WHERE IdInventario = @invId_${item.IdInventario}`);

        if (stockResult.recordset.length === 0) {
          throw new Error(`El insumo con ID ${item.IdInventario} no se encuentra en el inventario.`);
        }

        const currentStock = parseFloat(stockResult.recordset[0].Cantidad);
        const requiredAmount = parseFloat(item.CantidadInsumo);
        const nombreProd = stockResult.recordset[0].NombreProducto;

        if (currentStock < requiredAmount) {
          throw new Error(`Stock insuficiente para '${nombreProd}'. Disponible: ${currentStock}, Requerido: ${requiredAmount}`);
        }
      }

      // 7. Descontar stock
      for (const item of modifiedRecipe) {
        await request
          .input(`deductId_${item.IdInventario}`, sql.Int, item.IdInventario)
          .input(`deductQty_${item.IdInventario}`, sql.Decimal(10, 3), item.CantidadInsumo)
          .query(`
            UPDATE cafeteriadb.inventario
            SET Cantidad = Cantidad - @deductQty_${item.IdInventario}
            WHERE IdInventario = @deductId_${item.IdInventario}
          `);
      }

      // 8. Crear pedido
      const productResult = await request
        .input('pId', sql.Int, idProducto)
        .query('SELECT Precio, Nombre FROM cafeteriadb.Productos WHERE IdProducto = @pId');

      if (productResult.recordset.length === 0) {
        throw new Error('Producto no encontrado en el catálogo de productos.');
      }

      const precioBase = parseFloat(productResult.recordset[0].Precio);
      const nombreProdCat = productResult.recordset[0].Nombre;

      const ivaResult = await request
        .input('totalPrice', sql.Decimal(10, 2), precioBase)
        .query('SELECT cafeteriadb.CalcularIVA(@totalPrice) as iva');

      const iva = parseFloat(ivaResult.recordset[0].iva);
      const totalConIVA = parseFloat((precioBase + iva).toFixed(2));

      // Insertar en Pedidos
      const pedidoResult = await request
        .input('pedIdCliente', sql.Int, idCliente)
        .input('pedTotal', sql.Decimal(10, 2), totalConIVA)
        .input('pedIdUsuario', sql.Int, idUsuario)
        .query(`
          INSERT INTO cafeteriadb.Pedidos (IdCliente, Total, IdUsuario, Estado)
          OUTPUT INSERTED.IdPedido
          VALUES (@pedIdCliente, @pedTotal, @pedIdUsuario, 'Pendiente')
        `);

      const idPedido = pedidoResult.recordset[0].IdPedido;

      // Insertar en DetallePedidos
      await request
        .input('detIdPedido', sql.Int, idPedido)
        .input('detIdProducto', sql.Int, idProducto)
        .input('detCantidad', sql.Int, 1)
        .input('detSubtotal', sql.Decimal(10, 2), precioBase)
        .query(`
          INSERT INTO cafeteriadb.DetallePedidos (IdPedido, IdProducto, Cantidad, Subtotal)
          VALUES (@detIdPedido, @detIdProducto, @detCantidad, @detSubtotal)
        `);

      await transaction.commit();
      return { idPedido, producto: nombreProdCat };

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }
  }

};
