const authService = require('../services/authService');

module.exports = {
  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      const usuario = await authService.login(email, password);
      res.json({
        success: true,
        usuario
      });
    } catch (error) {
      console.error('Error en login:', error);
      if (error.message === 'Credenciales inválidas') {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
};
