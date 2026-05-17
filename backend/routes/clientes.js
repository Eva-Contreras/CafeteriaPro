const express = require('express');
const router = express.Router();
const { buscarClientes, crearCliente } = require('../controllers/clientesController');

router.get('/buscar', buscarClientes);
router.post('/', crearCliente);

module.exports = router;