const inventarioModel = require('../models/inventarioModel');
const nodemailer = require('nodemailer');

module.exports = {

  obtenerBebidas: async () => {
    return await inventarioModel.obtenerBebidas();
  },

  actualizarStock: async (id, stock) => {
    return await inventarioModel.actualizarStock(id, stock);
  },

  crearProducto: async (data) => {
    return await inventarioModel.crearProducto(data);
  },

  enviarOrdenCompra: async ({ producto, cantidad, motivo, destino, usuarioNombre }) => {
    const emailUser = process.env.EMAIL || process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const info = await transporter.sendMail({
      from: emailUser,
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

    return info.messageId;
  },

  obtenerInsumos: async () => {
    return await inventarioModel.obtenerInsumos();
  },

  crearNuevoInsumo: async (data) => {
    return await inventarioModel.crearNuevoInsumo(data);
  },

  crearProductoConReceta: async (data) => {
    return await inventarioModel.crearProductoConReceta(data);
  },

  obtenerReceta: async (idProducto) => {
    return await inventarioModel.obtenerReceta(idProducto);
  },

  actualizarReceta: async (idProducto, receta) => {
    return await inventarioModel.actualizarReceta(idProducto, receta);
  }

};
