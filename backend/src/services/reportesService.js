const reportesModel = require('../models/reportesModel');

module.exports = {
  obtenerTopProductos: async (inicio, fin) => {
    return await reportesModel.obtenerTopProductos(inicio, fin);
  }
};
