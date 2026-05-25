const reportesService = require('../services/reportesService');

module.exports = {
  getTopProductos: async (req, res) => {
    const { inicio, fin } = req.body;
    try {
      const top = await reportesService.obtenerTopProductos(inicio, fin);
      res.json(top);
    } catch (error) {
      console.error('Error en reporte top:', error);
      res.status(500).json({ error: 'Error al generar el reporte' });
    }
  }
};
