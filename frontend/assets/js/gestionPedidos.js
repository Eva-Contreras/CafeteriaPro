const API_URL = 'http://localhost:3000';

let pedidoActual              = [];
let allProducts               = [];
let clienteSeleccionadoNombre = '';
let listaInsumosGlobal        = [];

const resumenModal          = document.getElementById('resumenModal');
const listaPedidoModal      = document.getElementById('listaPedidoModal');
const totalModal            = document.getElementById('totalModal');
const closeButton           = document.querySelector('.close-button');
const cerrarYConfirmarButton = document.getElementById('cerrarYConfirmar');
const seguirAgregandoButton  = document.getElementById('seguirAgregando');

const clienteInitModal  = document.getElementById('clienteInitModal');
const inputBusqueda     = document.getElementById('busquedaCliente');
const btnBuscar         = document.getElementById('btnBuscarCliente');
const listaResultados   = document.getElementById('listaResultados');
const formNuevo         = document.getElementById('formNuevoCliente');
const selectMesaRapida  = document.getElementById('selectMesaRapida');
const btnRegistrar      = document.getElementById('btnRegistrarCliente');
const btnConfirmarMesa  = document.getElementById('btnConfirmarMesa');
const btnSalirPedidos   = document.getElementById('btnSalirPedidos');
const inputIdFinal      = document.getElementById('idClienteFinal');

const addProductModal = document.getElementById('addProductModal');
const btnAddProduct   = document.getElementById('btnAddProduct');
const btnCloseAdd     = document.querySelector('.close-add-product');
const formAdd         = document.getElementById('addProductForm');
const categorySelect  = document.getElementById('newProdCategory');

const userRole = localStorage.getItem('usuarioRol');

if (userRole === 'Encargado de inventario') {
  const pedidosLink = document.querySelector('nav a[href*="GestionPedidos.html"]');
  const panelLink   = document.querySelector('nav a[href*="Panel.html"]');
  if (pedidosLink) pedidosLink.style.display = 'none';
  if (panelLink)   panelLink.style.display   = 'none';
}

document.getElementById('btnCerrarSesion')
  ?.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '../../InicioDeSesion.html';
  });

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  clienteInitModal.style.display = 'flex';

  if (userRole === 'Cajero/Mesero') {
    const inventarioLink = document.querySelector('nav a[href*="Inventario"]');
    if (inventarioLink) inventarioLink.style.display = 'none';
  }

  if (userRole === 'Administrador') {
    const linkUsuarios = document.getElementById('linkUsuarios');
    if (linkUsuarios) linkUsuarios.style.display = 'inline-block';
    if (btnAddProduct) btnAddProduct.style.display = 'inline-block';
  }
});

async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/api/menu`);
    if (!response.ok) throw new Error('Error al cargar el menú');
    allProducts = await response.json();
    renderProducts(allProducts);
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al cargar los productos.');
  }
}

function renderProducts(products) {
  const container = document.getElementById('productsContainer');
  container.innerHTML = '';

  products.forEach(product => {
    const card     = document.createElement('div');
    card.className = 'card';
    card.dataset.id = product.IdProducto;
    const imgSrc   = product.ImagenUrl || 'https://via.placeholder.com/150?text=Sin+Imagen';

    card.innerHTML = `
      <img src="${imgSrc}" alt="${product.Nombre}"
        onerror="this.src='https://via.placeholder.com/150?text=Error+Imagen'">
      <h3 class="producto-nombre">${product.Nombre}</h3>
      <p class="producto-precio">Precio: $${product.Precio}</p>
      <div class="cantidad-control">
        <label for="cantidad-${product.IdProducto}">Cantidad:</label>
        <input type="number" value="0" min="0" class="producto-cantidad" id="cantidad-${product.IdProducto}">
        <div class="buttons">
          <button class="edit">✏️</button>
          <button class="ok">✔</button>
          <button class="delete">❌</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function cancelarPedidoYLimpiar(mostrarAlerta = true) {
  pedidoActual = [];
  document.querySelectorAll('.producto-cantidad').forEach(input => input.value = 0);
  document.querySelectorAll('.ok').forEach(button => {
    button.disabled            = false;
    button.style.backgroundColor = '';
    button.style.cursor        = 'pointer';
  });
  resumenModal.style.display = 'none';
  if (mostrarAlerta) alert('❌ Pedido Cancelado. El carrito ha sido vaciado.');
}

function mostrarResumenPedido() {
  listaPedidoModal.innerHTML = '';
  let subtotal = 0;

  if (pedidoActual.length === 0) {
    listaPedidoModal.innerHTML = '<li>No hay productos en el pedido.</li>';
    totalModal.textContent     = '$0.00';
  } else {
    pedidoActual.forEach(item => {
      const precioNumero = parseFloat(item.precio.replace('Precio: $', '').trim());
      const itemSubtotal = precioNumero * item.cantidad;
      subtotal          += itemSubtotal;

      const li       = document.createElement('li');
      li.innerHTML   = `${item.nombre} (x${item.cantidad}) - $${precioNumero.toFixed(2)} c/u = $${itemSubtotal.toFixed(2)}`;
      listaPedidoModal.appendChild(li);
    });

    const iva   = subtotal * 0.16;
    const total = subtotal + iva;

    totalModal.innerHTML = `
      <div><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</div>
      <div><strong>IVA (16%):</strong> $${iva.toFixed(2)}</div>
      <div style="font-size:1.2em; margin-top:5px;"><strong>Total:</strong> $${total.toFixed(2)}</div>
    `;
  }
  resumenModal.style.display = 'block';
}

function actualizarEstadoConfirmar(id, nombre) {
  inputIdFinal.value             = id;
  clienteSeleccionadoNombre      = nombre;
  btnConfirmarMesa.disabled      = false;
  btnConfirmarMesa.style.opacity = '1';
  btnConfirmarMesa.style.cursor  = 'pointer';
  btnConfirmarMesa.textContent   = `Confirmar ${nombre} y Continuar`;
  listaResultados.style.display  = 'none';
  formNuevo.style.display        = 'none';
}

btnBuscar.addEventListener('click', async () => {
  const texto = inputBusqueda.value.trim();
  if (texto.length < 2) return alert('Escribe al menos 2 letras para buscar.');

  try {
    const res      = await fetch(`${API_URL}/api/clientes/buscar?nombre=${encodeURIComponent(texto)}`);
    const clientes = await res.json();

    listaResultados.innerHTML    = '';
    listaResultados.style.display = 'block';
    formNuevo.style.display      = 'none';

    const divNuevo           = document.createElement('div');
    divNuevo.innerHTML       = `<em style="color:blue; font-weight:bold;">+ Registrar Nuevo Cliente</em>`;
    divNuevo.style.padding   = '8px';
    divNuevo.style.cursor    = 'pointer';
    divNuevo.onclick         = () => {
      formNuevo.style.display              = 'block';
      listaResultados.style.display        = 'none';
      document.getElementById('nuevoNombreCliente').value = texto;
    };
    listaResultados.appendChild(divNuevo);

    clientes.forEach(c => {
      const div             = document.createElement('div');
      div.innerHTML         = `<strong>${c.Nombre}</strong> <small>(${c.Email || 'Sin correo'})</small>`;
      div.style.padding     = '8px';
      div.style.cursor      = 'pointer';
      div.style.borderBottom = '1px solid #eee';
      div.onmouseover       = () => div.style.background = '#f0f0f0';
      div.onmouseout        = () => div.style.background = 'white';
      div.onclick           = () => actualizarEstadoConfirmar(c.IdCliente, c.Nombre);
      listaResultados.appendChild(div);
    });

  } catch (error) {
    console.error('Error buscando cliente:', error);
  }
});

btnRegistrar.addEventListener('click', async () => {
  const nombre = document.getElementById('nuevoNombreCliente').value.trim();
  const email  = document.getElementById('nuevoEmailCliente').value.trim();
  if (!nombre) return alert('El nombre es obligatorio.');
  if (!email)  return alert('⚠️ El correo es obligatorio para nuevos clientes.');

  try {
    const res  = await fetch(`${API_URL}/api/clientes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nombre, email })
    });
    const data = await res.json();

    if (data.success) {
      actualizarEstadoConfirmar(data.id, data.nombre);
      alert('✅ Cliente registrado y seleccionado.');
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) { console.error(error); }
});

selectMesaRapida.addEventListener('change', () => {
  const valor = selectMesaRapida.value;
  if (valor) {
    const texto = selectMesaRapida.options[selectMesaRapida.selectedIndex].text;
    actualizarEstadoConfirmar(valor, texto);
  }
});

btnConfirmarMesa.addEventListener('click', () => {
  if (inputIdFinal.value) {
    clienteInitModal.style.display = 'none';
    if (pedidoActual.length > 0) {
      cerrarYConfirmarButton.click();
    } else {
      alert(`✅ Cliente: ${clienteSeleccionadoNombre} seleccionado. Añade productos para finalizar.`);
    }
  }
});

btnSalirPedidos.addEventListener('click', () => {
  window.location.href = '../inicio/Inicio.html';
});

closeButton.addEventListener('click', () => cancelarPedidoYLimpiar());
seguirAgregandoButton.addEventListener('click', () => resumenModal.style.display = 'none');

window.addEventListener('click', (event) => {
  if (event.target === resumenModal)    cancelarPedidoYLimpiar();
  if (event.target === addProductModal) addProductModal.style.display = 'none';
});

cerrarYConfirmarButton.addEventListener('click', async () => {
  if (pedidoActual.length === 0) {
    alert('El pedido está vacío.');
    resumenModal.style.display = 'none';
    return;
  }

  const idCliente = inputIdFinal.value;
  if (!idCliente) {
    alert('⚠️ Error: No hay cliente seleccionado.');
    resumenModal.style.display     = 'none';
    clienteInitModal.style.display = 'flex';
    return;
  }

  let total          = 0;
  const productosParaDB = pedidoActual.map(item => {
    const precio   = parseFloat(item.precio.replace('Precio: $', '').trim());
    const subtotal = precio * item.cantidad;
    total         += subtotal;
    return { id: item.idProducto, cantidad: item.cantidad, subtotal: parseFloat(subtotal.toFixed(2)) };
  });

  const pedidoData = {
    idCliente:  parseInt(idCliente, 10),
    idUsuario:  parseInt(localStorage.getItem('usuarioId') || '1', 10),
    total:      parseFloat(total.toFixed(2)),
    productos:  productosParaDB,
    usuarioRol: localStorage.getItem('usuarioRol')
  };

  try {
    const response = await fetch(`${API_URL}/api/pedidos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(pedidoData)
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert(`✅ Pedido #${data.idPedido} guardado con éxito.`);
      cancelarPedidoYLimpiar(false);
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch (error) {
    console.error(error);
    alert('❌ Error de conexión.');
  }
});

document.getElementById('productsContainer').addEventListener('click', (e) => {
  const target = e.target;
  const card   = target.closest('.card');
  if (!card) return;

  if (target.classList.contains('ok')) {
    if (target.disabled) return;

    const idProducto   = parseInt(card.dataset.id, 10);
    const nombre       = card.querySelector('.producto-nombre').textContent.trim();
    const precio       = card.querySelector('.producto-precio').textContent.trim();
    const cantidadInput = card.querySelector('.producto-cantidad');
    const cantidad     = parseInt(cantidadInput.value, 10);

    if (cantidad < 1 || isNaN(cantidad)) return alert('Cantidad inválida');

    const existente = pedidoActual.find(p => p.idProducto === idProducto);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      pedidoActual.push({ idProducto, nombre, precio, cantidad });
      target.disabled              = true;
      target.style.backgroundColor = '#ccc';
      target.style.cursor          = 'default';
    }
    mostrarResumenPedido();
  }

  if (target.classList.contains('edit')) {
    const idProducto   = parseInt(card.dataset.id, 10);
    const cantidadInput = card.querySelector('.producto-cantidad');
    const nuevaCantidad = parseInt(cantidadInput.value, 10);

    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) return alert('Cantidad inválida');

    const existente = pedidoActual.find(p => p.idProducto === idProducto);
    if (existente) {
      existente.cantidad = nuevaCantidad;
      mostrarResumenPedido();
      alert('Cantidad actualizada.');
    } else {
      alert('Producto no añadido aún. Usa ✔ primero.');
    }
  }

  if (target.classList.contains('delete')) {
    const idProducto = parseInt(card.dataset.id, 10);
    const index      = pedidoActual.findIndex(p => p.idProducto === idProducto);

    if (index !== -1) {
      pedidoActual.splice(index, 1);
      mostrarResumenPedido();
      alert('Eliminado del pedido.');
      const okButton = card.querySelector('.ok');
      if (okButton) {
        okButton.disabled              = false;
        okButton.style.backgroundColor = '';
        okButton.style.cursor          = 'pointer';
      }
    } else {
      alert('Este producto no está en el pedido.');
    }
  }
});

async function cargarInsumosSistema() {
  try {
    const res        = await fetch(`${API_URL}/api/inventario/insumos`);
    listaInsumosGlobal = await res.json();
  } catch (e) { console.error('Error cargando insumos', e); }
}

function agregarFilaIngrediente() {
  const div       = document.createElement('div');
  div.className   = 'fila-ingrediente';
  div.style.cssText = 'display:flex; gap:10px; margin-bottom:8px;';

  let opciones = '<option value="">-- Insumo --</option>';
  listaInsumosGlobal.forEach(insumo => {
    opciones += `<option value="${insumo.IdInventario}">${insumo.NombreProducto}</option>`;
  });

  div.innerHTML = `
    <select class="sel-insumo" style="flex:2; padding:5px; border:1px solid #ccc; border-radius:4px;">${opciones}</select>
    <input type="number" class="inp-cantidad" placeholder="Cant. (ej: 0.250)" step="0.001"
      style="flex:1; padding:5px; border:1px solid #ccc; border-radius:4px;">
    <button type="button" onclick="this.parentElement.remove()"
      style="background:#dc3545; color:white; border:none; border-radius:4px; padding:0 10px; cursor:pointer;">&times;</button>
  `;
  document.getElementById('listaIngredientesContainer').appendChild(div);
}

if (btnAddProduct) {
  btnAddProduct.addEventListener('click', async () => {
    addProductModal.style.display = 'block';
    if (listaInsumosGlobal.length === 0) await cargarInsumosSistema();

    document.getElementById('listaIngredientesContainer').innerHTML = '';
    agregarFilaIngrediente();

    if (categorySelect && categorySelect.options.length <= 1) {
      try {
        const res = await fetch(`${API_URL}/api/menu/categorias`);
        if (res.ok) {
          const cats = await res.json();
          categorySelect.innerHTML = '<option value="">Seleccione...</option>';
          cats.forEach(c => {
            const op      = document.createElement('option');
            op.value      = c.IdCategoria;
            op.textContent = c.Nombre;
            categorySelect.appendChild(op);
          });
        }
      } catch (e) { console.error(e); }
    }
  });
}

if (btnCloseAdd) btnCloseAdd.addEventListener('click', () => addProductModal.style.display = 'none');

document.getElementById('btnAgregarIngrediente')
  ?.addEventListener('click', agregarFilaIngrediente);

if (formAdd) {
  formAdd.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productoData = {
      Nombre:      document.getElementById('newProdName').value,
      Descripcion: document.getElementById('newProdDesc').value,
      Precio:      parseFloat(document.getElementById('newProdPrice').value),
      Stock:       parseInt(document.getElementById('newProdStock').value),
      IdCategoria: parseInt(document.getElementById('newProdCategory').value),
      Imagen:      document.getElementById('newProdImage').value,
      Receta:      []
    };

    document.querySelectorAll('.fila-ingrediente').forEach(row => {
      const idInsumo = row.querySelector('.sel-insumo').value;
      const cantidad = row.querySelector('.inp-cantidad').value;
      if (idInsumo && cantidad) {
        productoData.Receta.push({
          IdInventario:   parseInt(idInsumo),
          CantidadInsumo: parseFloat(cantidad)
        });
      }
    });

    try {
      const res  = await fetch(`${API_URL}/api/inventario/productos-con-receta`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(productoData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('✅ Producto guardado correctamente.');
        addProductModal.style.display = 'none';
        formAdd.reset();
        loadProducts();
      } else {
        alert('❌ Error: ' + data.message);
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    }
  });
}

const modalQuick  = document.getElementById('modalQuickInsumo');
const btnAbrirQuick = document.getElementById('btnAbrirCrearInsumo');
const formQuick   = document.getElementById('formQuickInsumo');

if (btnAbrirQuick) {
  btnAbrirQuick.addEventListener('click', (e) => {
    e.preventDefault();
    modalQuick.style.display = 'flex';
  });
}

if (formQuick) {
  formQuick.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoInsumo = {
      nombre:    document.getElementById('qi_nombre').value,
      categoria: parseInt(document.getElementById('qi_categoria').value),
      cantidad:  parseFloat(document.getElementById('qi_cantidad').value),
      imagen:    document.getElementById('qi_imagen').value || 'https://via.placeholder.com/150'
    };

    try {
      const res = await fetch(`${API_URL}/api/inventario/nuevo-insumo`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(nuevoInsumo)
      });

      if (res.ok) {
        alert('✅ Ingrediente creado.');
        modalQuick.style.display = 'none';
        formQuick.reset();
        await cargarInsumosSistema();
        actualizarSelectsAbiertos();
      } else {
        alert('Error al guardar');
      }
    } catch (error) { console.error(error); }
  });
}

function actualizarSelectsAbiertos() {
  let nuevasOpciones = '<option value="">-- Insumo --</option>';
  listaInsumosGlobal.forEach(insumo => {
    nuevasOpciones += `<option value="${insumo.IdInventario}">${insumo.NombreProducto}</option>`;
  });

  document.querySelectorAll('.sel-insumo').forEach(select => {
    const valorActual  = select.value;
    select.innerHTML   = nuevasOpciones;
    select.value       = valorActual;
  });
}