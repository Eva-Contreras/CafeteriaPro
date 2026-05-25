const usuariosService = require('../services/usuariosService');

module.exports = {
  getUsuarios: async (req, res) => {
    try {
      const usuarios = await usuariosService.obtenerUsuarios();
      res.json(usuarios);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  },

  crearUsuario: async (req, res) => {
    const { nombre, correo, contrasena, rol } = req.body;
    try {
      const id = await usuariosService.crearUsuario({ nombre, correo, contrasena, rol });
      res.json({
        success: true,
        id,
        message: 'Usuario creado exitosamente.'
      });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      if (error.message === 'El correo ya está registrado.') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Error al crear usuario' });
    }
  },

  actualizarUsuario: async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, rol } = req.body;
    try {
      await usuariosService.actualizarUsuario(id, { nombre, correo, rol });
      res.json({ success: true, message: 'Usuario actualizado correctamente.' });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
  },

  eliminarUsuario: async (req, res) => {
    const { id } = req.params;
    try {
      await usuariosService.eliminarUsuario(id);
      res.json({ success: true, message: 'Usuario eliminado correctamente.' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
  }
};
