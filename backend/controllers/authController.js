const { getPool, sql } = require('../config/db');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email',    sql.NVarChar, email)
      .input('password', sql.NVarChar, password)
      .query(`
        SELECT IdUsuario, Nombre, Rol, Correo 
        FROM cafeteriadb.Usuarios 
        WHERE Correo = @email AND Contrasena = @password
      `);

    const users = result.recordset;

    if (users.length > 0) {
      res.json({
        success: true,
        usuario: {
          IdUsuario: users[0].IdUsuario,
          Nombre:    users[0].Nombre,
          Rol:       users[0].Rol,
          Correo:    users[0].Correo
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { login };