const { getPool, sql } = require('../config/db');
const nodemailer = require('nodemailer');

const getPedidosPendientes = async (req, res) => {
  try {
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

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ error: 'Error al obtener lista de pedidos' });
  }
};

const getPedidosCompletados = async (req, res) => {
  try {
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

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al obtener pedidos completados:', error);
    res.status(500).json({ error: 'Error al obtener pedidos completados' });
  }
};

const getDetallePedido = async (req, res) => {
  const { id } = req.params;

  try {
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

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al obtener el detalle del pedido:', error);
    res.status(500).json({ error: 'Error al obtener detalles del pedido' });
  }
};

const getClientePedido = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT c.Nombre, c.Email
        FROM cafeteriadb.Pedidos p
        JOIN cafeteriadb.Clientes c ON p.IdCliente = c.IdCliente
        WHERE p.IdPedido = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json({
      nombre: result.recordset[0].Nombre,
      email: result.recordset[0].Email
    });

  } catch (error) {
    console.error('Error al obtener cliente del pedido:', error);
    res.status(500).json({ error: 'Error al obtener información del cliente' });
  }
};

const completarPedido = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE cafeteriadb.Pedidos 
        SET Estado = 'Completado' 
        WHERE IdPedido = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
    }

    res.json({ success: true, message: 'Estado del pedido actualizado a Completado.' });

  } catch (error) {
    console.error('Error al completar pedido:', error);
    res.status(500).json({ success: false, message: 'Error interno al actualizar el estado.' });
  }
};

const crearPedido = async (req, res) => {
  const { idCliente, total, idUsuario, productos } = req.body;

  let transaction;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

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

      // SI EL PRODUCTO ES PERSONALIZADO:
      if (producto.personalizado) {
        const { idLeche, shots } = producto.personalizado;
        const request = new sql.Request(transaction);

        // 1. Obtener la receta base del producto
        const baseRecipeResult = await request
          .input('idProd', sql.Int, producto.id)
          .query('SELECT IdInventario, CantidadInsumo FROM cafeteriadb.recetas WHERE IdProducto = @idProd');

        // 2. Obtener la leche seleccionada
        let newMilk = null;
        if (idLeche > 0) {
          const selectedMilkResult = await request
            .input('idLeche', sql.Int, idLeche)
            .query('SELECT IdInventario, CantidadBase FROM cafeteriadb.TiposLeche WHERE IdLeche = @idLeche');
          if (selectedMilkResult.recordset.length > 0) {
            newMilk = selectedMilkResult.recordset[0];
          }
        }

        // 3. Obtener todas las leches
        const allMilksResult = await request.query('SELECT IdInventario FROM cafeteriadb.TiposLeche');
        const allMilkInventarioIds = allMilksResult.recordset.map(m => m.IdInventario);

        // 4. Obtener extra café
        let extraCafe = 0;
        if (shots > 0) {
          const shotsResult = await request
            .input('shotsCount', sql.Int, shots)
            .query('SELECT ExtraCafe FROM cafeteriadb.ShotsCafe WHERE CantidadShots = @shotsCount');
          if (shotsResult.recordset.length > 0) {
            extraCafe = parseFloat(shotsResult.recordset[0].ExtraCafe);
          }
        }

        // 5. Ajustar inventario (deshacer leche base y restar la personalizada)
        const baseRecipe = baseRecipeResult.recordset;
        const originalMilkInsumo = baseRecipe.find(item => allMilkInventarioIds.includes(item.IdInventario));

        // Re-sumar la leche original (porque el trigger la descontó)
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
    res.json({ success: true, message: 'Pedido registrado correctamente', idPedido });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Error al crear pedido:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const enviarTicket = async (req, res) => {
  const { orderId, email, orderSummary, details } = req.body;

  try {
    const subtotal = parseFloat(orderSummary.Total) - parseFloat(orderSummary.IVA);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .ticket { max-width: 600px; margin: 0 auto; border: 2px solid #5a3d31; border-radius: 10px; padding: 20px; }
          .header { text-align: center; background: #5a3d31; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .product-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .product-table th, .product-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .product-table th { background: #f5f5f5; }
          .total-breakdown { text-align: right; font-size: 1.1em; margin-top: 20px; }
          .total-breakdown div { margin: 5px 0; }
          .total-final { font-size: 1.3em; font-weight: bold; border-top: 2px solid #5a3d31; padding-top: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>CoffeeTrack</h1>
            <h2>Ticket de Compra #${orderId}</h2>
          </div>
          <div class="details">
            <p><strong>Cliente:</strong> ${orderSummary.NombreCliente}</p>
            <p><strong>Fecha:</strong> ${new Date(orderSummary.Fecha).toLocaleString('es-MX')}</p>
            <p><strong>Atendido por:</strong> ${orderSummary.NombreUsuario}</p>
            <p><strong>Estado:</strong> ${orderSummary.Estado}</p>
          </div>
          <table class="product-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${details.map(item => `
                <tr>
                  <td>${item.NombreProducto}</td>
                  <td>${item.Cantidad}</td>
                  <td>$${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
                  <td>$${parseFloat(item.Subtotal).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-breakdown">
            <div><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</div>
            <div><strong>IVA (16%):</strong> $${parseFloat(orderSummary.IVA).toFixed(2)}</div>
            <div class="total-final"><strong>TOTAL:</strong> $${parseFloat(orderSummary.Total).toFixed(2)}</div>
          </div>
          <div class="footer">
            <p>¡Gracias por su preferencia!</p>
            <p>Visítanos nuevamente en CoffeeTrack</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Ticket de Compra - CoffeeTrack #${orderId}`,
      html: ticketHTML
    });

    console.log('✅ Ticket enviado: %s', info.messageId);
    res.json({ success: true, message: 'Ticket enviado correctamente', messageId: info.messageId });

  } catch (error) {
    console.error('❌ Error al enviar el ticket:', error);
    res.status(500).json({ success: false, message: 'Error al enviar el ticket: ' + error.message });
  }
};

const getTiposLeche = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT IdLeche, Nombre FROM cafeteriadb.TiposLeche ORDER BY Nombre');
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error al obtener tipos de leche:', error);
    res.status(500).json({ error: 'Error al obtener los tipos de leche de la base de datos' });
  }
};

const crearPedidoPersonalizado = async (req, res) => {
  const { idProducto, idLeche, shots, idCliente, idUsuario } = req.body;

  if (idProducto === undefined || idLeche === undefined || shots === undefined || !idCliente || !idUsuario) {
    return res.status(400).json({ success: false, message: 'Datos incompletos: idProducto, idLeche, shots, idCliente e idUsuario son requeridos' });
  }

  let transaction;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // 1. Obtener la receta base del producto
      const baseRecipeResult = await request
        .input('idProd', sql.Int, idProducto)
        .query('SELECT IdInventario, CantidadInsumo FROM cafeteriadb.recetas WHERE IdProducto = @idProd');

      // 2. Obtener la leche seleccionada (si idLeche > 0. Si idLeche = 0 significa 'No aplica')
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

      // 3. Obtener todas las posibles leches para identificarlas y removerlas de la receta base
      const allMilksResult = await request.query('SELECT IdInventario FROM cafeteriadb.TiposLeche');
      const allMilkInventarioIds = allMilksResult.recordset.map(m => m.IdInventario);

      // 4. Obtener la configuración de shots (si shots > 0. Si shots = 0 significa 'No aplica')
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

      // 5. Modificar la receta en memoria
      // Filtramos quitando la leche original (si tuviera)
      const baseRecipe = baseRecipeResult.recordset;
      const modifiedRecipe = baseRecipe.filter(item => !allMilkInventarioIds.includes(item.IdInventario));

      // Agregamos la nueva leche seleccionada (si aplica)
      if (newMilk) {
        modifiedRecipe.push({
          IdInventario: newMilk.IdInventario,
          CantidadInsumo: parseFloat(newMilk.CantidadBase)
        });
      }

      // Aumentamos café según shots
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

      // 6. VALIDAR STOCK
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

      // 7. DESCONTAR INVENTARIO
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

      // 8. Crear el pedido en las tablas Pedidos y DetallePedidos
      const productResult = await request
        .input('pId', sql.Int, idProducto)
        .query('SELECT Precio, Nombre FROM cafeteriadb.Productos WHERE IdProducto = @pId');

      if (productResult.recordset.length === 0) {
        throw new Error('Producto no encontrado en el catálogo de productos.');
      }

      const precioBase = parseFloat(productResult.recordset[0].Precio);
      const nombreProdCat = productResult.recordset[0].Nombre;

      // Calcular IVA y total
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
      res.json({
        success: true,
        message: 'Pedido personalizado registrado y descontado del inventario correctamente',
        idPedido,
        producto: nombreProdCat
      });

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Error al crear pedido personalizado:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPedidosPendientes,
  getPedidosCompletados,
  getDetallePedido,
  getClientePedido,
  completarPedido,
  crearPedido,
  enviarTicket,
  getTiposLeche,
  crearPedidoPersonalizado
};