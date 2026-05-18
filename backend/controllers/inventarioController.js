const { getPool, sql } = require('../config/db');
const nodemailer = require('nodemailer');

const getBebidas = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.IdProducto, p.Nombre, p.Descripcion, p.Precio, p.Stock, p.ImagenUrl
      FROM cafeteriadb.Productos p
      JOIN cafeteriadb.Categorias c ON p.IdCategoria = c.IdCategoria
      WHERE c.Nombre = 'Bebidas'
      ORDER BY p.Nombre
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener bebidas:', error);
    res.status(500).json({ error: 'Error al obtener bebidas' });
  }
};

const actualizarStock = async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('stock', sql.Int, stock)
      .input('id', sql.Int, id)
      .query(`
        UPDATE cafeteriadb.Productos
        SET Stock = @stock
        WHERE IdProducto = @id
      `);
    res.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
};

const crearProducto = async (req, res) => {
  const { Nombre, Descripcion, Precio, Stock, IdCategoria, Imagen } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion)
      .input('Precio', sql.Decimal, Precio)
      .input('Stock', sql.Int, Stock)
      .input('IdCategoria', sql.Int, IdCategoria)
      .input('Imagen', sql.NVarChar, Imagen)
      .query(`
        INSERT INTO cafeteriadb.Productos (Nombre, Descripcion, Precio, Stock, IdCategoria, ImagenUrl)
        OUTPUT INSERTED.IdProducto
        VALUES (@Nombre, @Descripcion, @Precio, @Stock, @IdCategoria, @Imagen)
      `);
    res.status(201).json({ success: true, id: result.recordset[0].IdProducto });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto: ' + error.message });
  }
};

const enviarOrdenCompra = async (req, res) => {
  const { producto, cantidad, motivo, destino, usuarioNombre } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: destino,
      subject: `ORDEN DE COMPRA: ${producto} - URGENCIAS`,
      html: `
        <h3>Nueva Solicitud de Orden de Compra</h3>
        <p>El empleado ${usuarioNombre || 'Sistema'} ha solicitado una orden urgente de inventario.</p>
        <hr>
        <p><strong>Producto Solicitado:</strong> ${producto}</p>
        <p><strong>Cantidad a Ordenar:</strong> ${cantidad} unidades</p>
        <p><strong>Motivo / Observaciones:</strong> ${motivo || 'No especificado'}</p>
        <p>Por favor, procesar esta orden lo antes posible.</p>
      `
    });
    console.log('✅ Correo enviado: %s', info.messageId);
    res.json({ success: true, message: 'Orden de compra enviada por correo con éxito.' });
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error);
    res.status(500).json({ success: false, message: 'Fallo al enviar el correo de orden.' });
  }
};

const getInsumos = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT IdInventario, NombreProducto 
      FROM cafeteriadb.inventario 
      ORDER BY NombreProducto
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener insumos:', error);
    res.status(500).json({ error: 'Error al obtener insumos' });
  }
};

const crearNuevoInsumo = async (req, res) => {
  const { nombre, categoria, cantidad, imagen } = req.body;
  try {
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
    res.status(201).json({ success: true, id: result.recordset[0].IdInventario });
  } catch (error) {
    console.error('Error al crear nuevo insumo:', error);
    res.status(500).json({ success: false, message: 'Error al crear insumo: ' + error.message });
  }
};

const crearProductoConReceta = async (req, res) => {
  const { Nombre, Descripcion, Precio, Stock, IdCategoria, Imagen, Receta } = req.body;
  let transaction;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

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
    res.status(201).json({ success: true, id: idProducto });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error in rollback:', rollbackError);
      }
    }
    console.error('Error al crear producto con receta:', error);
    res.status(500).json({ success: false, message: 'Error al crear producto: ' + error.message });
  }
};

module.exports = {
  getBebidas,
  actualizarStock,
  crearProducto,
  enviarOrdenCompra,
  getInsumos,
  crearNuevoInsumo,
  crearProductoConReceta
};