const bcrypt = require('bcrypt');
const usuariosModel = require('../models/usuariosModel');

module.exports = {
  login: async (email, password) => {
    const usuario = await usuariosModel.buscarPorCorreo(email);
    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    let passwordMatch = false;

    // 1. Intentar validar usando bcrypt
    try {
      passwordMatch = await bcrypt.compare(password, usuario.Contrasena);
    } catch (error) {
      // Si la contraseña en DB no es un hash válido de bcrypt, ignoramos el error para probar texto plano
      passwordMatch = false;
    }

    // 2. Si falla bcrypt, intentar validar en texto plano (soporte híbrido para usuarios existentes)
    if (!passwordMatch) {
      passwordMatch = (password === usuario.Contrasena);
    }

    if (!passwordMatch) {
      throw new Error('Credenciales inválidas');
    }

    return {
      IdUsuario: usuario.IdUsuario,
      Nombre: usuario.Nombre,
      Rol: usuario.Rol,
      Correo: usuario.Correo
    };
  }
};
