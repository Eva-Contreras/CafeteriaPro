(function() {
  // Global override for window.alert and window.confirm
  
  window.alert = function(message, callback) {
    return new Promise((resolve) => {
      // Remove any existing custom alert
      const existing = document.getElementById('coffee-custom-alert-container');
      if (existing) existing.remove();

      // Create background overlay
      const container = document.createElement('div');
      container.id = 'coffee-custom-alert-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.2s ease;
        font-family: 'Poppins', sans-serif;
      `;

      // Clean message: remove excessive emojis for a cleaner, premium feel
      let cleanMessage = message.toString()
        .replace(/🚨|🎉|❌|✅|⚠️|🗑️/g, '')
        .replace(/🔴 PRODUCTOS CRÍTICOS:/g, '<strong style="color: #c62828; display: block; margin-top: 8px; margin-bottom: 4px;">PRODUCTOS CRÍTICOS:</strong>')
        .replace(/🟡 PRODUCTOS BAJOS:/g, '<strong style="color: #ef6c00; display: block; margin-top: 12px; margin-bottom: 4px;">PRODUCTOS BAJOS:</strong>')
        .replace(/🔴|🟡/g, '•')
        .replace(/\n/g, '<br>')
        .trim();

      // Create modal content box
      const alertBox = document.createElement('div');
      alertBox.style.cssText = `
        background: #ffffff;
        padding: 20px 24px;
        border-radius: 12px;
        max-width: 360px;
        width: 85%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        border: 1px solid #d7ccc8;
        transform: scale(0.9);
        transition: transform 0.2s ease;
        text-align: center;
        box-sizing: border-box;
      `;

      // Determine clean icon/styling based on message content
      let iconHTML = '<i class="fa-solid fa-circle-info" style="color: #8d6e63; font-size: 1.3rem;"></i>';
      let titleText = 'Notificación';
      
      if (message.includes('Error') || message.includes('denegado') || message.includes('incorrectos') || message.includes('No se pudo')) {
        iconHTML = '<i class="fa-solid fa-circle-xmark" style="color: #c62828; font-size: 1.3rem;"></i>';
        titleText = 'Error';
      } else if (message.includes('STOCK BAJO') || message.includes('ATENCIÓN') || message.includes('obligatorio')) {
        iconHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef6c00; font-size: 1.3rem;"></i>';
        titleText = 'Atención';
      } else if (message.includes('exito') || message.includes('éxito') || message.includes('correctamente') || message.includes('Bienvenido')) {
        iconHTML = '<i class="fa-solid fa-circle-check" style="color: #2e7d32; font-size: 1.3rem;"></i>';
        titleText = 'Éxito';
      }

      alertBox.innerHTML = `
        <div style="font-size: 1rem; font-weight: 600; color: #5d4037; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          ${iconHTML}
          <span>${titleText}</span>
        </div>
        <div style="color: #4e342e; font-size: 0.88rem; line-height: 1.5; margin-bottom: 18px; text-align: left; max-height: 240px; overflow-y: auto; padding-right: 5px;">
          ${cleanMessage}
        </div>
        <button id="coffee-custom-alert-btn" style="
          background: #5d4037;
          color: white;
          border: none;
          padding: 8px 16px;
          font-size: 0.88rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
          outline: none;
          box-shadow: 0 2px 6px rgba(93, 64, 55, 0.15);
        ">Aceptar</button>
      `;

      container.appendChild(alertBox);
      document.body.appendChild(container);

      // Animation start
      requestAnimationFrame(() => {
        container.style.opacity = '1';
        alertBox.style.transform = 'scale(1)';
      });

      const closeAlert = () => {
        container.style.opacity = '0';
        alertBox.style.transform = 'scale(0.9)';
        setTimeout(() => {
          container.remove();
          resolve();
          if (typeof callback === 'function') callback();
        }, 180);
      };

      const btn = document.getElementById('coffee-custom-alert-btn');
      btn.addEventListener('click', closeAlert);
      
      // Keyboard enter key listener
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.removeEventListener('keydown', handleKeyDown);
          closeAlert();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
    });
  };

  window.confirm = function(message, callback) {
    return new Promise((resolve) => {
      // Remove any existing custom confirm
      const existing = document.getElementById('coffee-custom-confirm-container');
      if (existing) existing.remove();

      // Create background overlay
      const container = document.createElement('div');
      container.id = 'coffee-custom-confirm-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.2s ease;
        font-family: 'Poppins', sans-serif;
      `;

      let cleanMessage = message.toString()
        .replace(/🚨|🎉|❌|✅|⚠️|🗑️/g, '')
        .replace(/\n/g, '<br>')
        .trim();

      // Create modal content box
      const confirmBox = document.createElement('div');
      confirmBox.style.cssText = `
        background: #ffffff;
        padding: 20px 24px;
        border-radius: 12px;
        max-width: 360px;
        width: 85%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        border: 1px solid #d7ccc8;
        transform: scale(0.9);
        transition: transform 0.2s ease;
        text-align: center;
        box-sizing: border-box;
      `;

      confirmBox.innerHTML = `
        <div style="font-size: 1rem; font-weight: 600; color: #5d4037; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-circle-question" style="color: #8d6e63; font-size: 1.3rem;"></i>
          <span>Confirmación</span>
        </div>
        <div style="color: #4e342e; font-size: 0.88rem; line-height: 1.5; margin-bottom: 18px; text-align: left;">
          ${cleanMessage}
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="coffee-custom-confirm-no" style="
            background: #f5f5f5;
            color: #5d4037;
            border: 1px solid #d7ccc8;
            padding: 8px 16px;
            font-size: 0.88rem;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            flex: 1;
            outline: none;
            transition: all 0.2s;
          ">No</button>
          <button id="coffee-custom-confirm-yes" style="
            background: #5d4037;
            color: white;
            border: none;
            padding: 8px 16px;
            font-size: 0.88rem;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            flex: 1;
            outline: none;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(93, 64, 55, 0.15);
          ">Sí</button>
        </div>
      `;

      container.appendChild(confirmBox);
      document.body.appendChild(container);

      // Animation start
      requestAnimationFrame(() => {
        container.style.opacity = '1';
        confirmBox.style.transform = 'scale(1)';
      });

      const handleResponse = (accepted) => {
        container.style.opacity = '0';
        confirmBox.style.transform = 'scale(0.9)';
        setTimeout(() => {
          container.remove();
          resolve(accepted);
          if (typeof callback === 'function') callback(accepted);
        }, 180);
      };

      document.getElementById('coffee-custom-confirm-yes').addEventListener('click', () => handleResponse(true));
      document.getElementById('coffee-custom-confirm-no').addEventListener('click', () => handleResponse(false));

      // Key listeners for Enter (yes) and Escape (no)
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.removeEventListener('keydown', handleKeyDown);
          handleResponse(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          window.removeEventListener('keydown', handleKeyDown);
          handleResponse(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
    });
  };
})();
