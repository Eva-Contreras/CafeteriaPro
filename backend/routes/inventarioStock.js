const express = require('express');
const router = express.Router();
const {
  getProducto,
  actualizarProducto,
  getProductosPorCategoria,
  getCategorias,
  crearProducto,
  eliminarProducto,
  getStatus,
  getInventarioCompleto,
  getStockCritico,
  getStockBajo
} = require('../controllers/inventarioStockController');

router.get('/status', getStatus);
router.get('/categorias', getCategorias);
router.get('/stock-bajo', getStockBajo);
router.get('/vistas/inventario-completo', getInventarioCompleto);
router.get('/vistas/stock-critico', getStockCritico);
router.get('/categoria/:idCategoria', getProductosPorCategoria);
router.get('/producto/:id', getProducto);
router.post('/producto', crearProducto);
router.put('/producto/:id', actualizarProducto);
router.delete('/producto/:id', eliminarProducto);

module.exports = router;