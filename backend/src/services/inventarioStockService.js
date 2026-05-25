const inventarioStockModel = require('../models/inventarioStockModel');

module.exports = {

  obtenerProducto: async (id) => {
    return await inventarioStockModel.obtenerProducto(id);
  },

  actualizarProducto: async (id, cantidad) => {
    return await inventarioStockModel.actualizarProducto(id, cantidad);
  },

  obtenerProductosPorCategoria: async (idCategoria) => {
    return await inventarioStockModel.obtenerProductosPorCategoria(idCategoria);
  },

  obtenerCategorias: async () => {
    return await inventarioStockModel.obtenerCategorias();
  },

  crearProducto: async (data) => {
    return await inventarioStockModel.crearProducto(data);
  },

  eliminarProducto: async (id) => {
    return await inventarioStockModel.eliminarProducto(id);
  },

  obtenerStatusDB: async () => {
    return await inventarioStockModel.obtenerStatusDB();
  },

  obtenerInventarioCompleto: async () => {
    return await inventarioStockModel.obtenerInventarioCompleto();
  },

  obtenerStockCritico: async () => {
    return await inventarioStockModel.obtenerStockCritico();
  },

  obtenerStockBajo: async () => {
    return await inventarioStockModel.obtenerStockBajo();
  }

};
