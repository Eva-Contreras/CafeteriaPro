const clientesService = require('../services/clientesService');

module.exports = {
  buscarClientes: async (req, res) => {
    const { nombre } = req.query;
    try {
      const clientes = await clientesService.buscarClientes(nombre);
      res.json(clientes);
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      res.status(500).json({ error: 'Error al buscar cliente' });
    }
  },

  crearCliente: async (req, res) => {
    const { nombre, email } = req.body;
    try {
      const client = await clientesService.crearCliente(nombre, email);
      res.json({
        success: true,
        id: client.IdCliente,
        nombre
      });
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      if (error.message && error.message.includes('UNIQUE KEY constraint')) {
        return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado. Usa otro o busca el cliente.' });
      }
      res.status(500).json({ success: false, message: 'Error interno al registrar cliente' });
    }
  }
};
