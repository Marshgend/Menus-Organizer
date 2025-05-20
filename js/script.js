const MOMENTOS = [
  { key: "desayuno", label: "Desayuno", aliases: ["desayuno"] },
  {
    key: "colacion1",
    label: "Colación / Snack 1",
    aliases: ["colación", "colacion", "snack"],
  },
  { key: "comida", label: "Comida", aliases: ["comida"] },
  {
    key: "colacion2",
    label: "Colación / Snack 2",
    aliases: ["colación", "colacion", "snack"],
  },
  { key: "cena", label: "Cena", aliases: ["cena"] },
];

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

let currentMenuPorDia = {};
const LOCAL_STORAGE_KEY = "weeklyMenuData";

// --- Funciones de Persistencia ---
function saveMenuState() {
  if (Object.keys(currentMenuPorDia).length > 0) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentMenuPorDia));
    console.log("Estado del menú guardado en localStorage.");
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar si no hay datos
    console.log("No hay datos de menú para guardar, localStorage limpiado.");
  }
}

function loadMenuState() {
  const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      // Validar que parsedData tenga la estructura esperada (simple check)
      if (parsedData && typeof parsedData === "object" && parsedData[0]) {
        currentMenuPorDia = parsedData;
        console.log("Estado del menú cargado desde localStorage.");
        return true;
      } else {
        console.warn("Datos en localStorage no tienen formato esperado, ignorando.");
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar datos inválidos
        return false;
      }
    } catch (error) {
      console.error("Error al parsear datos de localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar datos corruptos
      return false;
    }
  }
  console.log("No se encontró estado del menú en localStorage.");
  return false;
}

// --- Funciones Principales ---
function getMomentoKey(sectionName, usedMoments) {
  const name = sectionName.trim().toLowerCase();
  for (const momento of MOMENTOS) {
    if (momento.aliases.some((alias) => name.startsWith(alias))) {
      if (
        momento.key.startsWith("colacion") &&
        usedMoments.filter((k) => k.startsWith("colacion")).length === 1
      ) {
        return "colacion2";
      }
      if (!usedMoments.includes(momento.key)) {
        return momento.key;
      }
    }
  }
  return `momento_no_mapeado_${usedMoments.length}`;
}

function parseMenu(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const categorias = [];
  let currentCategoria = null;
  let currentOpcion = null;
  let currentPlatillo = null;
  let usedMoments = [];

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (/^[^\s]/.test(line)) {
      const momentoKey = getMomentoKey(trimmedLine, usedMoments);
      usedMoments.push(momentoKey);
      currentCategoria = {
        name: trimmedLine,
        momentoKey,
        options: [],
      };
      categorias.push(currentCategoria);
      currentOpcion = null;
      currentPlatillo = null;
      continue;
    }

    if (/^  [^\s]/.test(line) && currentCategoria) {
      const match = line.match(/^  (.+?)\s*-\s*(\d+)\s*d[ií]as?$/i);
      if (match) {
        currentOpcion = {
          title: match[1].trim(),
          days: parseInt(match[2], 10),
          dishes: [],
        };
        currentCategoria.options.push(currentOpcion);
        currentPlatillo = null;
      }
      continue;
    }

    if (/^    [^\s]/.test(line) && currentOpcion) {
      currentPlatillo = {
        name: trimmedLine,
        ingredients: [],
      };
      currentOpcion.dishes.push(currentPlatillo);
      continue;
    }

    if (/^      [^\s]/.test(line) && currentPlatillo) {
      const ingMatch = trimmedLine.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
      if (ingMatch) {
        currentPlatillo.ingredients.push({
          name: ingMatch[1].trim(),
          qty: ingMatch[2].trim(),
          unit: ingMatch[3].trim(),
        });
      } else {
        currentPlatillo.ingredients.push({
          name: trimmedLine,
          qty: "",
          unit: "",
        });
      }
      continue;
    }
  }

  const menuPorDia = {};
  DIAS.forEach((_, i) => {
    menuPorDia[i] = {};
    MOMENTOS.forEach((momento) => {
      menuPorDia[i][momento.key] = null;
    });
  });

  for (const momento of MOMENTOS) {
    let opcionesDelMomentoAcumuladas = [];
    categorias
      .filter((cat) => cat.momentoKey === momento.key)
      .forEach((cat) => {
        if (cat.options) {
          cat.options.forEach((op) => {
            for (let i = 0; i < op.days; i++) {
              opcionesDelMomentoAcumuladas.push(op);
            }
          });
        }
      });
    while (opcionesDelMomentoAcumuladas.length < DIAS.length) {
      opcionesDelMomentoAcumuladas.push(null);
    }
    opcionesDelMomentoAcumuladas = opcionesDelMomentoAcumuladas.slice(
      0,
      DIAS.length
    );
    for (let d = 0; d < DIAS.length; d++) {
      menuPorDia[d][momento.key] = opcionesDelMomentoAcumuladas[d];
    }
  }
  currentMenuPorDia = menuPorDia; // Actualizar estado global después de parsear
  return menuPorDia;
}

function renderMenuTable(menuDataToRender) {
  // Usar menuDataToRender para renderizar, currentMenuPorDia es el estado global
  const menuTableDiv = document.getElementById("menuTable");
  menuTableDiv.innerHTML = "";

  const table = document.createElement("table");
  table.className = "menu-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const thEmpty = document.createElement("th");
  headRow.appendChild(thEmpty);
  DIAS.forEach((dia) => {
    const th = document.createElement("th");
    th.textContent = dia;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  MOMENTOS.forEach((momento) => {
    const tr = document.createElement("tr");
    tr.className = `row-${momento.key}`;
    const tdLabel = document.createElement("td");
    tdLabel.className = "moment-label";
    tdLabel.textContent = momento.label;
    tr.appendChild(tdLabel);

    for (let d = 0; d < DIAS.length; d++) {
      const td = document.createElement("td");
      const opcion = menuDataToRender[d]?.[momento.key]; // Usar datos pasados
      if (opcion) {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.setAttribute("draggable", "true");
        card.dataset.momento = momento.key;
        card.dataset.dia = d.toString();

        card.addEventListener("dragstart", (e) => {
          card.classList.add("dragging");
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ momento: momento.key, dia: d })
          );
          e.dataTransfer.effectAllowed = "move";
        });
        card.addEventListener("dragend", () => {
          card.classList.remove("dragging");
          document
            .querySelectorAll(".menu-card.over")
            .forEach((el) => el.classList.remove("over"));
        });
        card.addEventListener("dragover", (e) => {
          e.preventDefault();
          const dragging = document.querySelector(".menu-card.dragging");
          if (
            dragging &&
            card.dataset.momento === dragging.dataset.momento &&
            card !== dragging
          ) {
            card.classList.add("over");
          }
        });
        card.addEventListener("dragleave", () => {
          card.classList.remove("over");
        });
        card.addEventListener("drop", (e) => {
          e.preventDefault();
          card.classList.remove("over");
          const dataText = e.dataTransfer.getData("text/plain");
          if (!dataText) return;
          const data = JSON.parse(dataText);
          if (
            data.momento === momento.key &&
            data.dia.toString() !== card.dataset.dia
          ) {
            const sourceDia = parseInt(data.dia);
            const targetDia = parseInt(card.dataset.dia);
            // Modificar currentMenuPorDia directamente
            const temp = currentMenuPorDia[sourceDia][momento.key];
            currentMenuPorDia[sourceDia][momento.key] =
              currentMenuPorDia[targetDia][momento.key];
            currentMenuPorDia[targetDia][momento.key] = temp;
            renderMenuTable(currentMenuPorDia); // Re-render con el estado global actualizado
            saveMenuState(); // Guardar después de reordenar
          }
        });
        card.addEventListener("mouseenter", () => {
          if (!card.classList.contains("dragging")) {
            card.style.boxShadow = "0 0 0 3px #4f8cff55, 0 2px 8px #0001";
          }
        });
        card.addEventListener("mouseleave", () => {
          card.style.boxShadow = "";
        });

        const optTitle = document.createElement("div");
        optTitle.className = "option-title";
        optTitle.textContent = opcion.title;
        card.appendChild(optTitle);
        if (opcion.dishes && opcion.dishes.length > 0) {
          const dishesList = document.createElement("ul");
          dishesList.className = "dishes-list";
          opcion.dishes.forEach((dish) => {
            const dishLi = document.createElement("li");
            const dishTitle = document.createElement("div");
            dishTitle.className = "dish-title";
            dishTitle.textContent = dish.name;
            dishLi.appendChild(dishTitle);
            if (dish.ingredients && dish.ingredients.length > 0) {
              const ingList = document.createElement("ul");
              ingList.className = "ingredients-list";
              dish.ingredients.forEach((ing) => {
                const ingLi = document.createElement("li");
                let ingText = ing.name;
                if (ing.qty) ingText += ` | ${ing.qty}`;
                if (ing.unit) ingText += ` | ${ing.unit}`;
                ingLi.textContent = ingText;
                ingList.appendChild(ingLi);
              });
              dishLi.appendChild(ingList);
            }
            dishesList.appendChild(dishLi);
          });
          card.appendChild(dishesList);
        }
        td.appendChild(card);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  menuTableDiv.appendChild(table);
  document.getElementById("exportPDFBtn").disabled =
    Object.keys(menuDataToRender).length === 0 || !menuDataToRender[0];
}

function exportToPDF() {
  const originalTableElement = document.querySelector(
    "#menuTable .menu-table"
  );
  if (!originalTableElement) {
    console.error("Elemento .menu-table original no encontrado.");
    alert("No se encontró la tabla del menú para exportar.");
    return;
  }
  console.log("Iniciando exportación a PDF (Estrategia de Clonación)...");
  const clonedTableElement = originalTableElement.cloneNode(true);
  clonedTableElement.classList.add("print-mode");
  clonedTableElement.style.position = "absolute";
  clonedTableElement.style.left = "-9999px";
  clonedTableElement.style.top = "-9999px";
  clonedTableElement.style.zIndex = "-1";
  document.body.appendChild(clonedTableElement);
  console.log("Clon de tabla creado y añadido al DOM (oculto).");
  console.log(
    "Clon scrollWidth:",
    clonedTableElement.scrollWidth,
    "scrollHeight:",
    clonedTableElement.scrollHeight
  );

  html2canvas(clonedTableElement, {
    scale: 1.5,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: true,
    scrollX: 0,
    scrollY: 0,
    windowWidth: clonedTableElement.offsetWidth,
    windowHeight: clonedTableElement.offsetHeight,
  })
    .then((canvas) => {
      console.log(
        "html2canvas completado sobre el clon. Canvas:",
        canvas.width,
        "x",
        canvas.height
      );
      document.body.removeChild(clonedTableElement);
      console.log("Clon de tabla eliminado del DOM.");
      console.log("Generando PDF...");
      const imgData = canvas.toDataURL("image/png");
      const pdf = new window.jspdf.jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "letter", // Cambiado a letter
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const imgWidth = pageWidth - 2 * margin;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight > pageHeight - 2 * margin) {
        imgHeight = pageHeight - 2 * margin;
      }
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      console.log("Generando blob del PDF...");
      const blob = pdf.output("blob");
      console.log("Blob generado, abriendo URL...");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      console.log("PDF abierto o intento de apertura realizado.");
    })
    .catch((err) => {
      console.error("Error durante la exportación a PDF:", err);
      if (document.body.contains(clonedTableElement)) {
        document.body.removeChild(clonedTableElement);
        console.log("Clon de tabla eliminado del DOM después de error.");
      }
      alert(
        "Hubo un error al generar el PDF. Revisa la consola para más detalles."
      );
    });
}

function resetApplication(
  inputTextElem,
  inputAreaElem,
  menuTableContainerElem,
  menuTableDivElem,
  exportPDFBtnElem
) {
  console.log("Reiniciando aplicación...");
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  currentMenuPorDia = {};
  if (menuTableDivElem) menuTableDivElem.innerHTML = ""; // Limpiar tabla visualmente
  if (inputTextElem) inputTextElem.value = ""; // Limpiar textarea

  // Restaurar visibilidad
  if (inputAreaElem) inputAreaElem.classList.remove("hidden");
  if (menuTableContainerElem) menuTableContainerElem.classList.add("hidden");

  // Deshabilitar botón de exportar
  if (exportPDFBtnElem) exportPDFBtnElem.disabled = true;

  console.log("Aplicación reiniciada al estado inicial.");
}

document.addEventListener("DOMContentLoaded", () => {
  const inputText = document.getElementById("inputText");
  const inputArea = document.querySelector(".input-area");
  const menuTableContainer = document.getElementById("menuTableContainer");
  const menuTableDiv = document.getElementById("menuTable"); // Para limpiar en reset
  const parseBtn = document.getElementById("parseBtn");
  const exportPDFBtn = document.getElementById("exportPDFBtn");
  const resetBtn = document.getElementById("resetBtn"); // Nuevo botón

  // Intentar cargar estado al inicio
  if (loadMenuState()) {
    renderMenuTable(currentMenuPorDia);
    inputArea.classList.add("hidden");
    menuTableContainer.classList.remove("hidden");
    exportPDFBtn.disabled = false;
  } else {
    // Estado inicial si no hay datos guardados
    inputArea.classList.remove("hidden");
    menuTableContainer.classList.add("hidden");
    exportPDFBtn.disabled = true;
  }

  parseBtn.addEventListener("click", () => {
    const text = inputText.value;
    if (!text.trim()) {
      alert("Por favor, pega el texto del menú antes de procesar.");
      // No cambiar visibilidad si no hay texto
      exportPDFBtn.disabled = true; // Asegurar que esté deshabilitado
      return;
    }
    const parsedMenu = parseMenu(text); // parseMenu actualiza currentMenuPorDia
    renderMenuTable(parsedMenu); // renderMenuTable usa currentMenuPorDia
    saveMenuState(); // Guardar después de parsear y renderizar

    inputArea.classList.add("hidden");
    menuTableContainer.classList.remove("hidden");
    // exportPDFBtn ya se habilita en renderMenuTable
  });

  exportPDFBtn.addEventListener("click", () => {
    if (Object.keys(currentMenuPorDia).length === 0 || !currentMenuPorDia[0]) {
      alert("Primero procesa un menú para poder exportarlo.");
      return;
    }
    exportToPDF();
  });

  resetBtn.addEventListener("click", () => {
    resetApplication(
      inputText,
      inputArea,
      menuTableContainer,
      menuTableDiv,
      exportPDFBtn
    );
  });
});