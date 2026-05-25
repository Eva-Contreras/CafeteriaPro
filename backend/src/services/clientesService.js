const clientesModel = require('../models/clientesModel');

module.exports = {
  buscarClientes: async (nombre) => {
    return await clientesModel.buscarPorNombre(nombre);
  },
  crearCliente: async (nombre, email) => {
    return await clientesModel.crear(nombre, email);
  }
};
