const { sequelize, Sequelize } = require('../config/sql.js');
const ClientesModel = require('./clientesModel');
const Cliente = ClientesModel.sequelizeModel;

// 1. Definición de Modelos Sequelize
class Pedido extends Sequelize.Model {}
Pedido.init({
  IdPedido: {
    type: Sequelize.DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  IdCliente: Sequelize.DataTypes.INTEGER,
  Fecha: {
    type: Sequelize.DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  Total: Sequelize.DataTypes.DECIMAL(10, 2),
  IdUsuario: Sequelize.DataTypes.INTEGER,
  Estado: Sequelize.DataTypes.STRING
}, {
  sequelize,
  modelName: 'Pedido',
  tableName: 'Pedidos',
  schema: 'cafeteriadb',
  timestamps: false
});

class DetallePedido extends Sequelize.Model {}
DetallePedido.init({
  IdDetalle: {
    type: Sequelize.DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  IdPedido: Sequelize.DataTypes.INTEGER,
  IdProducto: Sequelize.DataTypes.INTEGER,
  Cantidad: Sequelize.DataTypes.INTEGER,
  Subtotal: Sequelize.DataTypes.DECIMAL(10, 2)
}, {
  sequelize,
  modelName: 'DetallePedido',
  tableName: 'DetallePedidos',
  schema: 'cafeteriadb',
  timestamps: false
});



// Importar modelos necesarios para relaciones
const InventarioModel = require('./inventarioModel');
const { Producto, Inventario, Receta } = InventarioModel.models;
const UsuariosModel = require('./usuariosModel');
const Usuario = UsuariosModel.sequelizeModel;

// Relaciones
Pedido.belongsTo(Cliente, { foreignKey: 'IdCliente', as: 'ClienteDetalle' });
Pedido.belongsTo(Usuario, { foreignKey: 'IdUsuario', as: 'UsuarioDetalle' });
Pedido.hasMany(DetallePedido, { foreignKey: 'IdPedido', as: 'Detalles' });
DetallePedido.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'ProductoDetalle' });

class PedidosModel {
  static get models() {
    return { Pedido, DetallePedido };
  }

  static async obtenerPedidosPendientes() {
    return await Pedido.findAll({
      where: { Estado: 'Pendiente' },
      include: [
        { model: Cliente, as: 'ClienteDetalle', attributes: ['Nombre'] },
        { model: Usuario, as: 'UsuarioDetalle', attributes: ['Nombre'] }
      ],
      order: [['Fecha', 'DESC']]
    });
  }

  static async obtenerPedidosCompletados() {
    return await Pedido.findAll({
      where: { Estado: 'Completado' },
      include: [
        { model: Cliente, as: 'ClienteDetalle', attributes: ['Nombre'] },
        { model: Usuario, as: 'UsuarioDetalle', attributes: ['Nombre'] }
      ],
      order: [['Fecha', 'DESC']]
    });
  }

  static async obtenerDetallePedido(id) {
    return await DetallePedido.findAll({
      where: { IdPedido: id },
      include: {
        model: Producto,
        as: 'ProductoDetalle',
        attributes: ['Nombre', 'Precio']
      }
    });
  }

  static async obtenerClientePedido(id) {
    const pedido = await Pedido.findByPk(id, {
      include: {
        model: Cliente,
        as: 'ClienteDetalle',
        attributes: ['Nombre', 'Email']
      }
    });
    return pedido ? pedido.ClienteDetalle : null;
  }

  static async completarPedido(id) {
    const affected = await Pedido.update(
      { Estado: 'Completado' },
      { where: { IdPedido: id } }
    );
    return affected[0];
  }

  static async obtenerTiposLeche() {
    return [
      { IdLeche: 'Entera', Nombre: 'Entera' },
      { IdLeche: 'Deslactosada', Nombre: 'Deslactosada' },
      { IdLeche: 'Almendra', Nombre: 'Almendra' }
    ];
  }

  static async crearPedido({ idCliente, total, idUsuario, productos }) {
    const t = await sequelize.transaction();
    try {
      // 1. Calcular IVA usando función SQL Server
      const [ivaRes] = await sequelize.query(
        'SELECT cafeteriadb.CalcularIVA(:total) AS iva',
        { replacements: { total }, type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      const iva = parseFloat(ivaRes.iva);
      const totalConIVA = parseFloat((parseFloat(total) + iva).toFixed(2));

      // 2. Crear Pedido
      const newPedido = await Pedido.create({
        IdCliente: idCliente,
        Total: totalConIVA,
        IdUsuario: idUsuario,
        Estado: 'Pendiente'
      }, { transaction: t });

      const idPedido = newPedido.IdPedido;

      // 3. Crear Detalles y aplicar lógica personalizada
      for (const prod of productos) {
        const newDetalle = await DetallePedido.create({
          IdPedido: idPedido,
          IdProducto: prod.id,
          Cantidad: prod.cantidad,
          Subtotal: prod.subtotal
        }, { transaction: t });

        if (prod.personalizado) {
          const { tipoLeche, shots } = prod.personalizado;

          // Recetas base del producto
          const baseRecipe = await Receta.findAll({
            where: { IdProducto: prod.id },
            transaction: t
          });

          // Inventarios de leches fijas (4: Entera, 5: Deslactosada, 6: Almendra)
          const allMilkInventarioIds = [4, 5, 6];

          const originalMilkInsumo = baseRecipe.find(item => allMilkInventarioIds.includes(item.IdInventario));

          // A. Deshacer el descuento automático del trigger para la leche base
          if (originalMilkInsumo) {
            await Inventario.increment(
              { Cantidad: parseFloat(originalMilkInsumo.CantidadInsumo) },
              { where: { IdInventario: originalMilkInsumo.IdInventario }, transaction: t }
            );
          }

          // B. Descontar utilizando el Procedimiento Almacenado sp_personalizar_bebida
          await sequelize.query(
            'EXEC cafeteriadb.sp_personalizar_bebida @IdDetalle = :idDetalle, @TipoLeche = :tipoLeche, @CantidadShots = :cantidadShots',
            {
              replacements: {
                idDetalle: newDetalle.IdDetalle,
                tipoLeche: tipoLeche || 'Sin Leche',
                cantidadShots: shots || 1
              },
              type: Sequelize.QueryTypes.RAW,
              transaction: t
            }
          );
        }
      }

      await t.commit();
      return { idPedido, totalConIVA };

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async crearPedidoPersonalizado({ idProducto, tipoLeche, shots, idCliente, idUsuario }) {
    const t = await sequelize.transaction();
    try {
      // 1. Receta base
      const baseRecipe = await Receta.findAll({
        where: { IdProducto: idProducto },
        transaction: t
      });

      // 2. Obtener tipos leches disponibles en BD para reversar si corresponde
      const allMilkInventarioIds = [4, 5, 6];

      const originalMilkInsumo = baseRecipe.find(item => allMilkInventarioIds.includes(item.IdInventario));

      // 3. Crear el pedido
      const prodInfo = await Producto.findByPk(idProducto, { transaction: t });
      if (!prodInfo) {
        throw new Error('Producto no encontrado en el catálogo de productos.');
      }

      const precioBase = parseFloat(prodInfo.Precio);
      const nombreProdCat = prodInfo.Nombre;

      const [ivaRes] = await sequelize.query(
        'SELECT cafeteriadb.CalcularIVA(:precio) AS iva',
        { replacements: { precio: precioBase }, type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      const iva = parseFloat(ivaRes.iva);
      const totalConIVA = parseFloat((precioBase + iva).toFixed(2));

      // Insertar en Pedidos
      const newPedido = await Pedido.create({
        IdCliente: idCliente,
        Total: totalConIVA,
        IdUsuario: idUsuario,
        Estado: 'Pendiente'
      }, { transaction: t });

      // Insertar en DetallePedidos (esto disparará el trigger de descuento base en la BD)
      const newDetalle = await DetallePedido.create({
        IdPedido: newPedido.IdPedido,
        IdProducto: idProducto,
        Cantidad: 1,
        Subtotal: precioBase
      }, { transaction: t });

      // A. Deshacer el descuento automático del trigger para la leche base
      if (originalMilkInsumo) {
        await Inventario.increment(
          { Cantidad: parseFloat(originalMilkInsumo.CantidadInsumo) },
          { where: { IdInventario: originalMilkInsumo.IdInventario }, transaction: t }
        );
      }

      // B. Descontar utilizando el Procedimiento Almacenado sp_personalizar_bebida
      await sequelize.query(
        'EXEC cafeteriadb.sp_personalizar_bebida @IdDetalle = :idDetalle, @TipoLeche = :tipoLeche, @CantidadShots = :cantidadShots',
        {
          replacements: {
            idDetalle: newDetalle.IdDetalle,
            tipoLeche: tipoLeche || 'Sin Leche',
            cantidadShots: shots || 1
          },
          type: Sequelize.QueryTypes.RAW,
          transaction: t
        }
      );

      await t.commit();
      return { idPedido: newPedido.IdPedido, producto: nombreProdCat };

    } catch (innerError) {
      await t.rollback();
      throw innerError;
    }
  }

}

module.exports = PedidosModel;
