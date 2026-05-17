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
  const { id }    = req.params;
  const { stock } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('stock', sql.Int, stock)
      .input('id',    sql.Int, id)
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
    const pool   = await getPool();
    const result = await pool.request()
      .input('Nombre',      sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion)
      .input('Precio',      sql.Decimal,  Precio)
      .input('Stock',       sql.Int,      Stock)
      .input('IdCategoria', sql.Int,      IdCategoria)
      .input('Imagen',      sql.NVarChar, Imagen)
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
      from:    process.env.EMAIL_USER,
      to:      destino,
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

module.exports = { getBebidas, actualizarStock, crearProducto, enviarOrdenCompra };