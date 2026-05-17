const API_URL = 'http://localhost:3000';

const userRole = localStorage.getItem('usuarioRol');

if (userRole === 'Encargado de inventario') {
  const pedidosLink = document.querySelector('nav a[href*="Gestion de pedidos.html"]');
  const panelLink   = document.querySelector('nav a[href*="Panel.html"]');
  if (pedidosLink) pedidosLink.style.display = 'none';
  if (panelLink)   panelLink.style.display   = 'none';
}

const modal                = document.getElementById('modal_editar');
const spanCerrar           = document.getElementsByClassName('cerrar')[0];
const btnCancelar          = document.querySelector('.btn_cancelar');
const formModal            = document.getElementById('form_modal');
const inputNombreProducto  = document.getElementById('nombre_producto');
const cantidadTotalInput   = document.getElementById('cantidad_total');
const contenedorInventario = document.querySelector('.inventario');

const ordenModal         = document.getElementById('ordenModal');
const closeButton        = ordenModal?.querySelector('.close-button');
const ordenForm          = document.getElementById('ordenForm');
const productoTitulo     = document.getElementById('productoTitulo');
const ordenProductoNombre = document.getElementById('ordenProductoNombre');
const ordenDestinoInput  = document.getElementById('ordenDestino');

let productoActual      = null;
let productoNombreActual = null;

function configurarRestriccionesPorRol() {
  const rol = localStorage.getItem('usuarioRol');
  console.log(`🔐 Rol detectado: ${rol}`);

  if (!rol) {
    console.warn('⚠️ No se encontró rol de usuario');
    return;
  }

  const usuariosLink         = document.getElementById('linkUsuarios');
  const btnReporteInventario = document.getElementById('btnReporteInventario');

  if (rol === 'Administrador') {
    if (usuariosLink)         usuariosLink.style.display         = 'inline-block';
    if (btnReporteInventario) btnReporteInventario.style.display = 'block';

  } else if (rol === 'Encargado de inventario') {
    if (usuariosLink)         usuariosLink.style.display         = 'none';
    if (btnReporteInventario) btnReporteInventario.style.display = 'block';

  } else if (rol === 'Cajero/Mesero') {
    if (usuariosLink)         usuariosLink.style.display         = 'none';
    if (btnReporteInventario) btnReporteInventario.style.display = 'none';
  }
}

function deshabilitarFuncionesInventario() {
  const rol               = localStorage.getItem('usuarioRol');
  const rolesNoPermitidos = ['Cajero/Mesero'];

  if (rolesNoPermitidos.includes(rol)) {
    document.querySelectorAll('.btn_editar, .btn_ordenar').forEach(btn => {
      btn.disabled      = true;
      btn.style.opacity = '0.4';
      btn.style.cursor  = 'not-allowed';
      btn.onclick = (e) => {
        e.stopPropagation();
        alert('Acceso de modificación restringido al rol de ' + rol);
      };
    });
    return true;
  }
  return false;
}

function obtenerCategoriaActual() {
  const nombreArchivo = window.location.pathname.split('/').pop();

  const mapeoCategorias = {
    'inventario_bebidas.html':  1,
    'inventario_comidas.html':  2,
    'inventario_envases.html':  3,
    'inventario_limpieza.html': 4,
    'inventario_menu.html':     1
  };

  return mapeoCategorias[nombreArchivo] || 1;
}

async function cargarProductos() {
  try {
    const categoriaId = obtenerCategoriaActual();
    console.log(`🔍 Cargando productos de categoría ${categoriaId}...`);

    const response = await fetch(`${API_URL}/api/inventario/categoria/${categoriaId}`);

    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const productos = await response.json();
    console.log(`✅ ${productos.length} productos recibidos`);

    actualizarCantidadesProductos(productos);

  } catch (error) {
    console.error('❌ Error al cargar productos:', error);
    mostrarErrorCarga(error);
  }
}

function actualizarCantidadesProductos(productos) {
  document.querySelectorAll('.producto').forEach(productoElement => {
    const nombreProducto = productoElement.querySelector('.nombre_del_producto')?.textContent?.trim();
    if (!nombreProducto) return;

    const productoBD = productos.find(p => p.NombreProducto?.trim() === nombreProducto);
    if (productoBD) {
      const inputCantidad = productoElement.querySelector('.cantidad_producto');
      if (inputCantidad) {
        inputCantidad.value = parseFloat(productoBD.Cantidad) || 0;
      }
    }
  });

  agregarEventListeners();
}

async function obtenerIdProducto(nombreProducto) {
  try {
    const categoriaId = obtenerCategoriaActual();
    const response    = await fetch(`${API_URL}/api/inventario/categoria/${categoriaId}`);
    const productos   = await response.json();

    const producto = productos.find(p =>
      p.NombreProducto?.trim().toLowerCase() === nombreProducto.trim().toLowerCase()
    );

    return producto ? producto.IdInventario : null;

  } catch (error) {
    console.error('Error al obtener ID del producto:', error);
    return null;
  }
}

async function obtenerConfiguracionProducto(idProducto) {
  try {
    const response = await fetch(`${API_URL}/api/inventario/producto/${idProducto}`);

    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const data = await response.json();

    if (data.success) {
      return {
        id:             data.producto.IdInventario,
        nombre:         data.producto.NombreProducto,
        cantidadActual: parseFloat(data.producto.Cantidad) || 0
      };
    } else {
      throw new Error(data.message);
    }

  } catch (error) {
    console.error('❌ Error al obtener configuración:', error);
    alert('Error al cargar los datos del producto');
    return null;
  }
}

async function abrirModal(nombreProducto) {
  try {
    const idProducto = await obtenerIdProducto(nombreProducto);
    if (!idProducto) {
      alert('Error: No se encontró el producto en la base de datos');
      return;
    }

    const config = await obtenerConfiguracionProducto(idProducto);
    if (!config) {
      alert('No se pudieron cargar los datos del producto');
      return;
    }

    productoNombreActual          = nombreProducto;
    inputNombreProducto.value     = config.nombre;
    cantidadTotalInput.value      = config.cantidadActual;

    setTimeout(() => {
      cantidadTotalInput.focus();
      cantidadTotalInput.select();
    }, 100);

    modal.style.display = 'flex';

  } catch (error) {
    console.error('❌ Error al abrir modal:', error);
    alert('Error al abrir el editor: ' + error.message);
  }
}

async function actualizarProducto(nombreProducto, nuevaCantidad) {
  try {
    const idProducto = await obtenerIdProducto(nombreProducto);
    if (!idProducto) {
      alert('Error: No se encontró el producto en la base de datos');
      return;
    }

    const response = await fetch(`${API_URL}/api/inventario/producto/${idProducto}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cantidad: nuevaCantidad })
    });

    const data = await response.json();

    if (data.success) {
      if (productoActual) {
        const inputCantidad = productoActual.querySelector('.cantidad_producto');
        if (inputCantidad) inputCantidad.value = nuevaCantidad;
      }
      cerrarModal();
      alert('¡Inventario actualizado correctamente!');
    } else {
      throw new Error(data.message || 'Error al actualizar el producto');
    }

  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    alert('Error al actualizar el producto: ' + error.message);
  }
}

function cerrarModal() {
  modal.style.display   = 'none';
  productoNombreActual  = null;
  productoActual        = null;
  formModal.reset();
}

async function cargarReporteInventario() {
  try {
    const response = await fetch(`${API_URL}/api/inventario/vistas/inventario-completo`);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const inventario = await response.json();
    generarHTMLReporte(inventario);

  } catch (error) {
    console.error('❌ Error al cargar reporte:', error);
    mostrarErrorReporte(error);
  }
}

function generarHTMLReporte(inventario) {
  const tabla = document.getElementById('tablaReporteInventario');
  if (!tabla) return;

  inventario.sort((a, b) => (parseInt(a.ID) || 0) - (parseInt(b.ID) || 0));

  tabla.innerHTML = `
    <div class="reporte-header">
      <h3>Todos los Productos</h3>
      <button id="btnStockBajo" class="btn-stock-bajo">
        <i class="fas fa-exclamation-triangle"></i> Ver Stock Bajo
      </button>
    </div>
    <div class="tabla-contenedor">
      <table class="detail-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${inventario.map(item => `
            <tr>
              <td>${item.ID      || 'N/A'}</td>
              <td>${item.Nombre  || 'Sin nombre'}</td>
              <td>${item.Categoria}</td>
              <td>${parseFloat(item.Cantidad) || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btnStockBajo')
    ?.addEventListener('click', cargarStockBajo);
}

async function cargarStockBajo() {
  try {
    const response = await fetch(`${API_URL}/api/inventario/vistas/stock-critico`);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const stockBajo = await response.json();

    if (stockBajo.length === 0) {
      mostrarMensajeSinStockBajo();
    } else {
      generarHTMLStockBajo(stockBajo);
    }

  } catch (error) {
    console.error('❌ Error al cargar stock bajo:', error);
    mostrarErrorReporte(error);
  }
}

function generarHTMLStockBajo(stockBajo) {
  const tabla = document.getElementById('tablaReporteInventario');
  if (!tabla) return;

  tabla.innerHTML = `
    <div class="reporte-header">
      <h3 style="color: #dc3545;">
        <i class="fas fa-exclamation-triangle"></i> Productos con Stock Bajo
      </h3>
      <button id="btnTodosProductos" class="btn-todos-productos">
        <i class="fas fa-list"></i> Ver Todos
      </button>
    </div>
    <div class="tabla-contenedor">
      <table class="detail-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Cantidad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${stockBajo.map(item => `
            <tr>
              <td>${item.ID     || 'N/A'}</td>
              <td>${item.Nombre || 'Sin nombre'}</td>
              <td>${item.Categoria}</td>
              <td>${parseFloat(item.Cantidad) || 0}</td>
              <td class="${item.Estado === 'CRÍTICO' ? 'estado-critico' : 'estado-bajo'}">
                ${item.Estado || 'BAJO'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="alerta-stock">
      <i class="fas fa-info-circle"></i>
      <strong>Total:</strong> ${stockBajo.length} producto(s) con stock bajo
    </div>
  `;

  document.getElementById('btnTodosProductos')
    ?.addEventListener('click', cargarReporteInventario);
}

function mostrarMensajeSinStockBajo() {
  const tabla = document.getElementById('tablaReporteInventario');
  if (!tabla) return;

  tabla.innerHTML = `
    <div class="mensaje-exito">
      <i class="fas fa-check-circle"></i>
      <h3>¡Excelente!</h3>
      <p>No hay productos con stock bajo</p>
      <button onclick="cargarReporteInventario()" class="btn-todos-productos">
        <i class="fas fa-list"></i> Ver Todos los Productos
      </button>
    </div>
  `;
}

function mostrarErrorReporte(error) {
  const tabla = document.getElementById('tablaReporteInventario');
  if (!tabla) return;

  tabla.innerHTML = `
    <div style="color: red; text-align: center; padding: 20px;">
      <h3>Error al cargar el reporte</h3>
      <p>${error.message}</p>
      <button onclick="cargarReporteInventario()" class="btn-reportes">
        Reintentar
      </button>
    </div>
  `;
}

function abrirModalReporte() {
  const modalReporte = document.getElementById('modalReporteInventario');
  if (modalReporte) {
    modalReporte.style.display = 'flex';
    cargarReporteInventario();
  }
}

function cerrarModalReporte() {
  const modalReporte = document.getElementById('modalReporteInventario');
  if (modalReporte) modalReporte.style.display = 'none';
}

function abrirModalOrdenar(nombreProducto) {
  if (productoTitulo && ordenProductoNombre) {
    productoTitulo.textContent                       = nombreProducto;
    ordenProductoNombre.value                        = nombreProducto;
    document.getElementById('ordenCantidad').value   = 1;
    document.getElementById('ordenMotivo').value     = '';
    ordenModal.style.display                         = 'flex';
  }
}

async function enviarOrdenCorreo(orderData) {
  try {
    const response = await fetch(`${API_URL}/api/inventario/ordenar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(orderData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`✅ ${data.message}`);
      ordenModal.style.display = 'none';
    } else {
      alert(`❌ Error al enviar orden: ${data.message || 'Error desconocido'}`);
    }

  } catch (error) {
    console.error('Error al enviar orden:', error);
    alert('❌ Error de conexión. Verifique el servidor.');
  }
}

function cerrarModalOrdenar() {
  ordenModal.style.display = 'none';
}

function agregarEventListeners() {
  const seAplicaronRestricciones = deshabilitarFuncionesInventario();
  if (seAplicaronRestricciones) return;

  document.getElementById('btnReporteInventario')
    ?.addEventListener('click', abrirModalReporte);

  document.querySelectorAll('.btn_editar').forEach(boton => {
    boton.onclick = function() {
      productoActual = this.closest('.producto');
      const nombre   = productoActual.querySelector('.nombre_del_producto')?.textContent?.trim();
      if (nombre) {
        abrirModal(nombre);
      } else {
        alert('Error: No se pudo obtener el nombre del producto');
      }
    };
  });

  document.querySelectorAll('.btn_ordenar').forEach(boton => {
    boton.onclick = function() {
      const nombre = this.closest('.producto')
        ?.querySelector('.nombre_del_producto')?.textContent?.trim();
      if (nombre) {
        abrirModalOrdenar(nombre);
      } else {
        alert('Error: No se pudo obtener el nombre del producto');
      }
    };
  });
}

if (formModal) {
  formModal.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!productoNombreActual) {
      alert('Error: No hay un producto seleccionado');
      return;
    }

    const nuevaCantidad = parseFloat(cantidadTotalInput.value);

    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
      alert('Por favor ingrese una cantidad válida');
      return;
    }

    await actualizarProducto(productoNombreActual, nuevaCantidad);
  });
}

if (ordenForm) {
  ordenForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    await enviarOrdenCorreo({
      producto:      ordenProductoNombre.value,
      cantidad:      parseInt(document.getElementById('ordenCantidad').value, 10),
      motivo:        document.getElementById('ordenMotivo').value,
      destino:       ordenDestinoInput.value,
      usuarioNombre: localStorage.getItem('usuarioNombre') || 'Usuario Cafetería'
    });
  });
}

if (spanCerrar)  spanCerrar.addEventListener('click',  cerrarModal);
if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);
if (closeButton) closeButton.addEventListener('click', cerrarModalOrdenar);

document.getElementById('closeReporteInventario')
  ?.addEventListener('click', cerrarModalReporte);

window.addEventListener('click', function(e) {
  if (e.target === modal)       cerrarModal();
  if (e.target === ordenModal)  cerrarModalOrdenar();
  if (e.target === document.getElementById('modalReporteInventario')) {
    cerrarModalReporte();
  }
});

function mostrarErrorCarga(error) {
  if (document.querySelectorAll('.producto').length === 0) {
    contenedorInventario.innerHTML = `
      <div class="error-carga">
        <h3>Error al cargar el inventario</h3>
        <p>${error.message}</p>
        <button onclick="cargarProductos()">Reintentar</button>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando sistema de inventario...');

  configurarRestriccionesPorRol();

  document.getElementById('closeReporteInventario')
    ?.addEventListener('click', cerrarModalReporte);

  const esMenuInventario = window.location.pathname.includes('inventario_menu');

  if (esMenuInventario) {
    verificarStockBajoAlEntrarInventario();

    document.getElementById('btnReporteInventario')
      ?.addEventListener('click', abrirModalReporte);

  } else {
    setTimeout(() => cargarProductos(), 100);
  }
});

async function verificarStockBajoAlEntrarInventario() {
  try {
    const rol = localStorage.getItem('usuarioRol');
    if (rol !== 'Administrador' && rol !== 'Encargado de inventario') return;

    const response = await fetch(`${API_URL}/api/inventario/vistas/stock-critico`);
    if (!response.ok) return;

    const stockBajo = await response.json();
    if (stockBajo.length > 0) mostrarAlertaStockBajo(stockBajo);

  } catch (error) {
    console.error('Error al verificar stock bajo:', error);
  }
}

function mostrarAlertaStockBajo(stockBajo) {
  const productosCriticos = stockBajo.filter(p => p.Estado === 'CRÍTICO');
  const productosBajos    = stockBajo.filter(p => p.Estado === 'BAJO');

  let mensaje = '🚨 ATENCIÓN - STOCK BAJO\n\n';

  if (productosCriticos.length > 0) {
    mensaje += '🔴 PRODUCTOS CRÍTICOS:\n';
    productosCriticos.forEach(p => {
      mensaje += `• ${p.Nombre}: ${p.Cantidad} unidades\n`;
    });
    mensaje += '\n';
  }

  if (productosBajos.length > 0) {
    mensaje += '🟡 PRODUCTOS BAJOS:\n';
    productosBajos.forEach(p => {
      mensaje += `• ${p.Nombre}: ${p.Cantidad} unidades\n`;
    });
  }

  mensaje += '\n⚠️ Por favor, revisa el inventario y genera las órdenes necesarias.';
  alert(mensaje);
}