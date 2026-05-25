const bcrypt = require('bcrypt');
const usuariosModel = require('../models/usuariosModel');

module.exports = {

  obtenerUsuarios: async () => {
    return await usuariosModel.obtenerUsuarios();
  },

  crearUsuario: async ({ nombre, correo, contrasena, rol }) => {
    const existente = await usuariosModel.buscarPorCorreo(correo);
    if (existente) {
      throw new Error('El correo ya está registrado.');
    }

    // Encriptación de contraseña usando bcrypt antes de guardar en DB
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    const idUsuario = await usuariosModel.insertarUsuario({
      nombre,
      correo,
      contrasena: hashedPassword,
      rol
    });

    return idUsuario;
  },

  actualizarUsuario: async (id, data) => {
    return await usuariosModel.actualizarUsuario(id, data);
  },

  eliminarUsuario: async (id) => {
    return await usuariosModel.eliminarUsuario(id);
  }

};
