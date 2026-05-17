const express = require('express');
const router = express.Router();
const {
  getPedidosPendientes,
  getPedidosCompletados,
  getDetallePedido,
  getClientePedido,
  completarPedido,
  crearPedido,
  enviarTicket
} = require('../controllers/pedidosController');

router.get('/', getPedidosPendientes);
router.get('/completados', getPedidosCompletados);
router.get('/:id/detalle', getDetallePedido);
router.get('/:id/cliente', getClientePedido);
router.put('/:id/completar', completarPedido);
router.post('/', crearPedido);
router.post('/enviar-ticket', enviarTicket);

module.exports = router;