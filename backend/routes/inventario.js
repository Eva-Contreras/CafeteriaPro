const express    = require('express');
const router     = express.Router();
const {
  getBebidas,
  actualizarStock,
  crearProducto,
  enviarOrdenCompra
} = require('../controllers/inventarioController');

router.get('/bebidas',        getBebidas);
router.put('/productos/:id',  actualizarStock);
router.post('/productos',     crearProducto);
router.post('/ordenar',       enviarOrdenCompra);

module.exports = router;