const express    = require('express');
const router     = express.Router();
const {
  getBebidas,
  actualizarStock,
  crearProducto,
  enviarOrdenCompra,
  getInsumos,
  crearNuevoInsumo,
  crearProductoConReceta,
  getReceta,
  actualizarReceta
} = require('../controllers/inventarioController');

router.get('/bebidas',        getBebidas);
router.put('/productos/:id',  actualizarStock);
router.post('/productos',     crearProducto);
router.post('/ordenar',       enviarOrdenCompra);

router.get('/insumos', getInsumos);
router.post('/nuevo-insumo', crearNuevoInsumo);
router.post('/productos-con-receta', crearProductoConReceta);

router.get('/productos/:id/receta', getReceta);
router.put('/productos/:id/receta', actualizarReceta);

module.exports = router;