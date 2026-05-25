const menuModel = require('../models/menuModel');

module.exports = {
  obtenerMenu: async () => {
    return await menuModel.obtenerMenu();
  },
  obtenerCategorias: async () => {
    return await menuModel.obtenerCategorias();
  }
};
