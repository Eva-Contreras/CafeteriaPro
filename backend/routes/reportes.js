const express = require('express');
const router = express.Router();
const { getTopProductos } = require('../controllers/reportesController');

router.post('/top', getTopProductos);

module.exports = router;