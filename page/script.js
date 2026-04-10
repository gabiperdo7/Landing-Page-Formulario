/*
  ARCHIVO: script.js
  Este archivo controla:
  1) Validaciones del formulario en el navegador.
  2) Contador de caracteres para el detalle del proyecto.
  3) Envío de datos a Google Sheets mediante Google Apps Script.
*/

// ============================================================
// CONFIGURACIÓN PRINCIPAL 
// ============================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBVCxHtFZaFSVGgSZRDubBjsrhjgadUZkzit0RbKcn65hU9VhcDx0hzLlFJqCuBVcF/exec";

// Si querés ver logs de ayuda en la consola, dejá true
const DEBUG_MODE = true;

/**
 * Inicializa toda la lógica cuando el DOM está listo.
 * Así evitamos errores si el script carga antes que el HTML.
 */
window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lead-form");
  const formStatus = document.getElementById("form-status");
  const detallesInput = document.getElementById("detallaProyecto");
  const charCounter = document.getElementById("char-counter");

  const fields = {
    nombres: document.getElementById("nombres"),
    apellidos: document.getElementById("apellidos"),
    nombreProyecto: document.getElementById("nombreProyecto"),
    mail: document.getElementById("mail"),
    telefono: document.getElementById("telefono"),
    detallaProyecto: document.getElementById("detallaProyecto"),
  };

  // Validación básica de existencia de elementos 
  if (!form || !formStatus || !detallesInput || !charCounter) {
    console.error(
      "No se encontraron elementos del formulario. Verificá IDs en index.html."
    );
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const onlyNumbersRegex = /^\d+$/;

  function setError(fieldName, message) {
    const errorElement = document.getElementById(`error-${fieldName}`);
    if (errorElement) errorElement.textContent = message;
  }

  function clearAllErrors() {
    Object.keys(fields).forEach((key) => setError(key, ""));
  }

  function validateForm() {
    clearAllErrors();
    let isValid = true;

    Object.entries(fields).forEach(([fieldName, input]) => {
      if (!input || !input.value.trim()) {
        setError(fieldName, "Este campo es obligatorio.");
        isValid = false;
      }
    });

    if (fields.mail.value.trim() && !emailRegex.test(fields.mail.value.trim())) {
      setError("mail", "Ingresá un correo válido. Ejemplo: nombre@dominio.com");
      isValid = false;
    }

    if (
      fields.telefono.value.trim() &&
      !onlyNumbersRegex.test(fields.telefono.value.trim())
    ) {
      setError("telefono", "El teléfono debe contener solo números.");
      isValid = false;
    }

    if (fields.detallaProyecto.value.length > 1000) {
      setError("detallaProyecto", "Máximo permitido: 1000 caracteres.");
      isValid = false;
    }

    return isValid;
  }

  function updateCharCounter() {
    const currentLength = detallesInput.value.length;
    charCounter.textContent = `${currentLength} / 1000`;
  }

  function buildPayload() {
    return {
      fecha: new Date().toISOString(),
      nombres: fields.nombres.value.trim(),
      apellidos: fields.apellidos.value.trim(),
      nombreProyecto: fields.nombreProyecto.value.trim(),
      mail: fields.mail.value.trim(),
      telefono: fields.telefono.value.trim(),
      detallaProyecto: fields.detallaProyecto.value.trim(),
    };
  }

  /**
   * Envío a Apps Script (form-urlencoded para máxima compatibilidad).
   */
  async function submitToGoogleSheets(payload) {
    const formBody = new URLSearchParams(payload);

    // Intento normal (permite leer respuesta)
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: formBody.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      try {
        return await response.json();
      } catch {
        return { status: "success", message: "Enviado correctamente." };
      }
    } catch (err) {
      // Fallback para entornos locales/file:// donde CORS puede bloquear respuesta
      if (DEBUG_MODE) {
        console.warn("Fetch normal falló. Intentando no-cors fallback.", err);
      }

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: formBody.toString(),
      });

      return {
        status: "success",
        message:
          "Enviado en modo local/no-cors. Revisá la hoja para confirmar la carga.",
      };
    }
  }

  detallesInput.addEventListener("input", updateCharCounter);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    formStatus.textContent = "";
    formStatus.className = "form-status";

    if (!validateForm()) {
      formStatus.textContent = "Revisá los campos marcados antes de enviar.";
      formStatus.classList.add("error");
      return;
    }

    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PEGAR_AQUI_URL")) {
      formStatus.textContent = "Falta configurar la URL de Apps Script en script.js.";
      formStatus.classList.add("error");
      return;
    }

    try {
      const payload = buildPayload();
      if (DEBUG_MODE) console.log("Payload a enviar:", payload);

      const result = await submitToGoogleSheets(payload);

      if (result.status === "success") {
        formStatus.textContent =
          result.message || "¡Formulario enviado correctamente!";
        formStatus.classList.add("success");
        form.reset();
        updateCharCounter();
        clearAllErrors();
      } else {
        formStatus.textContent =
          result.message || "No se pudo enviar el formulario. Intentá nuevamente.";
        formStatus.classList.add("error");
      }
    } catch (error) {
      formStatus.textContent =
        "Error enviando datos. Revisá URL, permisos y deployment de Apps Script.";
      formStatus.classList.add("error");
      console.error(error);
    }
  });

  // Inicializamos contador al cargar
  updateCharCounter();
});

/*
  NOTA DE SEGURIDAD:
  - La planilla debe permanecer privada.
  - Solo el administrador y autorizados deben ver los datos.
  - No mostrar los datos públicamente en la web.
*/