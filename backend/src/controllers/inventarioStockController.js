const inventarioStockService = require('../services/inventarioStockService');

module.exports = {
  getProducto: async (req, res) => {
    const { id } = req.params;
    try {
      const producto = await inventarioStockService.obtenerProducto(id);
      if (!producto) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      res.json({ success: true, producto });
    } catch (error) {
      console.error('❌ Error al obtener producto:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  actualizarProducto: async (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;
    try {
      const updatedProduct = await inventarioStockService.actualizarProducto(id, cantidad);
      res.json({
        success: true,
        message: 'Producto actualizado correctamente',
        cantidad_actualizada: parseFloat(cantidad),
        producto: {
          id: updatedProduct.IdInventario,
          nombre: updatedProduct.NombreProducto,
          cantidad: updatedProduct.Cantidad
        }
      });
    } catch (error) {
      console.error('❌ Error al actualizar producto:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor: ' + error.message });
    }
  },

  getProductosPorCategoria: async (req, res) => {
    const { idCategoria } = req.params;
    try {
      const productos = await inventarioStockService.obtenerProductosPorCategoria(idCategoria);
      res.json(productos);
    } catch (error) {
      console.error('❌ Error al obtener productos por categoría:', error);
      res.status(500).json({ error: 'Error al obtener productos', detalles: error.message });
    }
  },

  getCategorias: async (req, res) => {
    try {
      const categorias = await inventarioStockService.obtenerCategorias();
      res.json(categorias);
    } catch (error) {
      console.error('❌ Error al obtener categorías:', error);
      res.status(500).json({ error: 'Error al obtener categorías', detalles: error.message });
    }
  },

  crearProducto: async (req, res) => {
    try {
      const id = await inventarioStockService.crearProducto(req.body);
      res.status(201).json({
        success: true,
        message: 'Producto creado correctamente',
        id
      });
    } catch (error) {
      console.error('❌ Error al crear producto:', error);
      res.status(500).json({ success: false, message: 'Error al crear producto: ' + error.message });
    }
  },

  eliminarProducto: async (req, res) => {
    const { id } = req.params;
    try {
      await inventarioStockService.eliminarProducto(id);
      res.json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar producto: ' + error.message });
    }
  },

  getStatus: async (req, res) => {
    try {
      const dbStatus = await inventarioStockService.obtenerStatusDB();
      res.json({
        status: 'ok',
        database: dbStatus.database,
        tablas: dbStatus.tablas,
        total_productos: dbStatus.total_productos,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error en endpoint de status:', error);
      res.status(500).json({ status: 'error', error: error.message });
    }
  },

  getInventarioCompleto: async (req, res) => {
    try {
      const inventario = await inventarioStockService.obtenerInventarioCompleto();
      res.json(inventario);
    } catch (error) {
      console.error('❌ Error al cargar vista de inventario completo:', error);
      if (error.message.includes('vw_inventario_completo')) {
        return res.status(404).json({
          success: false,
          message: 'La vista vw_inventario_completo no existe.',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Error al cargar el inventario completo', error: error.message });
    }
  },

  getStockCritico: async (req, res) => {
    try {
      const criticos = await inventarioStockService.obtenerStockCritico();
      res.json(criticos);
    } catch (error) {
      console.error('❌ Error al cargar vista de stock crítico:', error);
      if (error.message.includes('vw_stock_critico')) {
        return res.status(404).json({
          success: false,
          message: 'La vista vw_stock_critico no existe.',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Error al cargar el stock crítico', error: error.message });
    }
  },

  getStockBajo: async (req, res) => {
    try {
      const bajo = await inventarioStockService.obtenerStockBajo();
      res.json(bajo);
    } catch (error) {
      console.error('❌ Error al obtener stock bajo:', error);
      res.status(500).json({ success: false, message: 'Error al obtener productos con stock bajo', error: error.message });
    }
  }
};
