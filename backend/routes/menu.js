const express = require('express');
const router = express.Router();
const { getMenu, getCategorias } = require('../controllers/menuController');

router.get('/', getMenu);
router.get('/categorias', getCategorias);

module.exports = router;