const pedidosService = require('../services/pedidosService');

module.exports = {

  getPedidosPendientes: async (req, res) => {
    try {
      const pedidos = await pedidosService.obtenerPedidosPendientes();
      res.json(pedidos);
    } catch (error) {
      console.error('Error al obtener pedidos pendientes:', error);
      res.status(500).json({ error: 'Error al obtener lista de pedidos' });
    }
  },

  getPedidosCompletados: async (req, res) => {
    try {
      const pedidos = await pedidosService.obtenerPedidosCompletados();
      res.json(pedidos);
    } catch (error) {
      console.error('Error al obtener pedidos completados:', error);
      res.status(500).json({ error: 'Error al obtener pedidos completados' });
    }
  },

  getDetallePedido: async (req, res) => {
    const { id } = req.params;
    try {
      const detalle = await pedidosService.obtenerDetallePedido(id);
      res.json(detalle);
    } catch (error) {
      console.error('Error al obtener el detalle del pedido:', error);
      res.status(500).json({ error: 'Error al obtener detalles del pedido' });
    }
  },

  getClientePedido: async (req, res) => {
    const { id } = req.params;
    try {
      const cliente = await pedidosService.obtenerClientePedido(id);
      if (!cliente) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      res.json({
        nombre: cliente.Nombre,
        email: cliente.Email
      });
    } catch (error) {
      console.error('Error al obtener cliente del pedido:', error);
      res.status(500).json({ error: 'Error al obtener información del cliente' });
    }
  },

  completarPedido: async (req, res) => {
    const { id } = req.params;
    try {
      const affected = await pedidosService.completarPedido(id);
      if (affected === 0) {
        return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
      }
      res.json({ success: true, message: 'Estado del pedido actualizado a Completado.' });
    } catch (error) {
      console.error('Error al completar pedido:', error);
      res.status(500).json({ success: false, message: 'Error interno al actualizar el estado.' });
    }
  },

  crearPedido: async (req, res) => {
    try {
      const result = await pedidosService.crearPedido(req.body);
      res.json({ success: true, message: 'Pedido registrado correctamente', idPedido: result.idPedido });
    } catch (error) {
      console.error('❌ Error al crear pedido:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  enviarTicket: async (req, res) => {
    try {
      const messageId = await pedidosService.enviarTicket(req.body);
      res.json({ success: true, message: 'Ticket enviado correctamente', messageId });
    } catch (error) {
      console.error('❌ Error al enviar el ticket:', error);
      res.status(500).json({ success: false, message: 'Error al enviar el ticket: ' + error.message });
    }
  },

  getTiposLeche: async (req, res) => {
    try {
      const leches = await pedidosService.obtenerTiposLeche();
      res.json(leches);
    } catch (error) {
      console.error('❌ Error al obtener tipos de leche:', error);
      res.status(500).json({ error: 'Error al obtener los tipos de leche de la base de datos' });
    }
  },

  crearPedidoPersonalizado: async (req, res) => {
    const { idProducto, idLeche, shots, idCliente, idUsuario } = req.body;

    if (idProducto === undefined || idLeche === undefined || shots === undefined || !idCliente || !idUsuario) {
      return res.status(400).json({ success: false, message: 'Datos incompletos: idProducto, idLeche, shots, idCliente e idUsuario son requeridos' });
    }

    try {
      const result = await pedidosService.crearPedidoPersonalizado({ idProducto, idLeche, shots, idCliente, idUsuario });
      res.json({
        success: true,
        message: 'Pedido personalizado registrado y descontado del inventario correctamente',
        idPedido: result.idPedido,
        producto: result.producto
      });
    } catch (error) {
      console.error('❌ Error al crear pedido personalizado:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

};
