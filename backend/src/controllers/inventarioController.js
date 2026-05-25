const inventarioService = require('../services/inventarioService');

module.exports = {
  getBebidas: async (req, res) => {
    try {
      const bebidas = await inventarioService.obtenerBebidas();
      res.json(bebidas);
    } catch (error) {
      console.error('Error al obtener bebidas:', error);
      res.status(500).json({ error: 'Error al obtener bebidas' });
    }
  },

  actualizarStock: async (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    try {
      await inventarioService.actualizarStock(id, stock);
      res.json({ success: true });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({ error: 'Error al actualizar stock' });
    }
  },

  crearProducto: async (req, res) => {
    try {
      const id = await inventarioService.crearProducto(req.body);
      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({ error: 'Error al crear producto: ' + error.message });
    }
  },

  enviarOrdenCompra: async (req, res) => {
    try {
      const messageId = await inventarioService.enviarOrdenCompra(req.body);
      res.json({ success: true, message: 'Orden de compra enviada por correo con éxito.', messageId });
    } catch (error) {
      console.error('❌ Error al enviar el correo:', error);
      res.status(500).json({ success: false, message: 'Fallo al enviar el correo de orden.' });
    }
  },

  getInsumos: async (req, res) => {
    try {
      const insumos = await inventarioService.obtenerInsumos();
      res.json(insumos);
    } catch (error) {
      console.error('Error al obtener insumos:', error);
      res.status(500).json({ error: 'Error al obtener insumos' });
    }
  },

  crearNuevoInsumo: async (req, res) => {
    try {
      const id = await inventarioService.crearNuevoInsumo(req.body);
      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error('Error al crear nuevo insumo:', error);
      res.status(500).json({ success: false, message: 'Error al crear insumo: ' + error.message });
    }
  },

  crearProductoConReceta: async (req, res) => {
    try {
      const id = await inventarioService.crearProductoConReceta(req.body);
      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error('Error al crear producto con receta:', error);
      res.status(500).json({ success: false, message: 'Error al crear producto: ' + error.message });
    }
  },

  getReceta: async (req, res) => {
    const { id } = req.params;
    try {
      const receta = await inventarioService.obtenerReceta(id);
      res.json(receta);
    } catch (error) {
      console.error('Error al obtener la receta:', error);
      res.status(500).json({ error: 'Error al obtener la receta del producto' });
    }
  },

  actualizarReceta: async (req, res) => {
    const { id } = req.params;
    const { Receta } = req.body;
    try {
      await inventarioService.actualizarReceta(id, Receta);
      res.json({ success: true, message: 'Receta actualizada correctamente' });
    } catch (error) {
      console.error('Error al actualizar receta:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar receta: ' + error.message });
    }
  }
};
