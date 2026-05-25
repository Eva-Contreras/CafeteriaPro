const pedidosModel = require('../models/pedidosModel');
const nodemailer = require('nodemailer');

module.exports = {

  obtenerPedidosPendientes: async () => {
    return await pedidosModel.obtenerPedidosPendientes();
  },

  obtenerPedidosCompletados: async () => {
    return await pedidosModel.obtenerPedidosCompletados();
  },

  obtenerDetallePedido: async (id) => {
    return await pedidosModel.obtenerDetallePedido(id);
  },

  obtenerClientePedido: async (id) => {
    return await pedidosModel.obtenerClientePedido(id);
  },

  completarPedido: async (id) => {
    return await pedidosModel.completarPedido(id);
  },

  obtenerTiposLeche: async () => {
    return await pedidosModel.obtenerTiposLeche();
  },

  crearPedido: async (data) => {
    return await pedidosModel.crearPedido(data);
  },

  crearPedidoPersonalizado: async (data) => {
    return await pedidosModel.crearPedidoPersonalizado(data);
  },

  enviarTicket: async ({ orderId, email, orderSummary, details }) => {
    const emailUser = process.env.EMAIL || process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

    const subtotal = parseFloat(orderSummary.Total) - parseFloat(orderSummary.IVA);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
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
      from: emailUser,
      to: email,
      subject: `Ticket de Compra - CoffeeTrack #${orderId}`,
      html: ticketHTML
    });

    return info.messageId;
  }

};
