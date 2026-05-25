require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { sequelize } = require('./config/sql');
const { connectMongo } = require('./config/nosql');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Servir archivos estáticos del frontend. Como server.js está en backend/src, subimos dos niveles
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Rutas de la API
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/menu',            require('./routes/menu'));
app.use('/api/pedidos',         require('./routes/pedidos'));
app.use('/api/inventario',      require('./routes/inventario'));
app.use('/api/inventario',      require('./routes/inventarioStock'));
app.use('/api/usuarios',        require('./routes/usuarios'));
app.use('/api/clientes',        require('./routes/clientes'));
app.use('/api/reportes',        require('./routes/reportes'));

// Manejador para redirigir cualquier otra ruta al index del frontend (Single Page App friendly)
app.use((req, res, next) => {
  // Solo redirige si no es una ruta de API (para evitar enmascarar errores de API con el HTML)
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'InicioDeSesion.html'));
});

// Middleware centralizado de manejo de errores dinámico (debe ir al final de todo)
const ErrorHandler = require('./middleware/errorHandler');
app.use(ErrorHandler.handle);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado en: http://localhost:${PORT}`);
  console.log('¡Tu API está lista para recibir peticiones del frontend!');
  
  // Autenticar conexión de Sequelize
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Conexión de base de datos mediante Sequelize exitosa!');
    })
    .catch((err) => {
      console.error('❌ Error al conectar a la base de datos mediante Sequelize:', err.message);
    });

  connectMongo();
});
