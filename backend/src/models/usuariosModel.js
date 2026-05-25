const { getPool, sql } = require('../config/sql.js');

module.exports = {

  obtenerUsuarios: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT IdUsuario, Nombre, Correo, Rol 
      FROM cafeteriadb.Usuarios
    `);
    return result.recordset;
  },

  buscarPorCorreo: async (correo) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('correo', sql.NVarChar, correo)
      .query(`
        SELECT IdUsuario, Nombre, Correo, Rol, Contrasena 
        FROM cafeteriadb.Usuarios 
        WHERE Correo = @correo
      `);
    return result.recordset[0] || null;
  },

  insertarUsuario: async ({ nombre, correo, contrasena, rol }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('nombre',    sql.NVarChar, nombre)
      .input('correo',    sql.NVarChar, correo)
      .input('contrasena', sql.NVarChar, contrasena)
      .input('rol',       sql.NVarChar, rol)
      .query(`
        INSERT INTO cafeteriadb.Usuarios (Nombre, Correo, Contrasena, Rol)
        OUTPUT INSERTED.IdUsuario
        VALUES (@nombre, @correo, @contrasena, @rol)
      `);
    return result.recordset[0].IdUsuario;
  },

  actualizarUsuario: async (id, { nombre, correo, rol }) => {
    const pool = await getPool();
    await pool.request()
      .input('nombre',  sql.NVarChar, nombre)
      .input('correo',  sql.NVarChar, correo)
      .input('rol',     sql.NVarChar, rol)
      .input('id',      sql.Int,      id)
      .query(`
        UPDATE cafeteriadb.Usuarios 
        SET Nombre = @nombre, Correo = @correo, Rol = @rol
        WHERE IdUsuario = @id
      `);
  },

  eliminarUsuario: async (id) => {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM cafeteriadb.Usuarios WHERE IdUsuario = @id');
  }

};
