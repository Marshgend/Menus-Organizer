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

let currentMenuPorDia = {}; // Almacena el estado del menú parseado

// Detecta el momento del día por nombre de sección (alineado con tu lógica original)
function getMomentoKey(sectionName, usedMoments) {
  const name = sectionName.trim().toLowerCase();
  for (const momento of MOMENTOS) {
    if (momento.aliases.some((alias) => name.startsWith(alias))) {
      // Si ya se usó este momento, y hay dos colaciones, asigna a la segunda colación
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
  // Fallback original si no se encuentra un match específico
  return `momento_no_mapeado_${usedMoments.length}`; // Fallback más descriptivo
}

// Parsea el texto a estructura por momento y día (alineado con tu lógica original)
function parseMenu(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const categorias = [];
  let currentCategoria = null;
  let currentOpcion = null;
  let currentPlatillo = null;
  let usedMoments = []; // Reiniciar para cada parseo

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Categoría (sin indentación)
    if (/^[^\s]/.test(line)) {
      // Usar trimmedLine para getMomentoKey
      const momentoKey = getMomentoKey(trimmedLine, usedMoments);
      usedMoments.push(momentoKey); // Actualización simple e inmediata

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

    // Opción (2 espacios)
    // Asegurarse de que currentCategoria no sea null (ej. si la primera línea no es categoría)
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

    // Platillo (4 espacios)
    // Asegurarse de que currentOpcion no sea null
    if (/^    [^\s]/.test(line) && currentOpcion) {
      currentPlatillo = {
        name: trimmedLine, // Usar trimmedLine
        ingredients: [],
      };
      currentOpcion.dishes.push(currentPlatillo);
      continue;
    }

    // Ingrediente (6 espacios)
    // Asegurarse de que currentPlatillo no sea null
    if (/^      [^\s]/.test(line) && currentPlatillo) {
      const ingMatch = trimmedLine.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
      if (ingMatch) {
        currentPlatillo.ingredients.push({
          name: ingMatch[1].trim(),
          qty: ingMatch[2].trim(),
          unit: ingMatch[3].trim(),
        });
      } else {
        // Si no hay formato con |, tomar toda la línea como nombre
        currentPlatillo.ingredients.push({
          name: trimmedLine,
          qty: "",
          unit: "",
        });
      }
      continue;
    }
  }

  // Distribuye las opciones por días para cada momento
  const menuPorDia = {};
  DIAS.forEach((_, i) => {
    menuPorDia[i] = {};
    MOMENTOS.forEach((momento) => {
      menuPorDia[i][momento.key] = null; // Inicializar todos los momentos para todos los días
    });
  });

  for (const momento of MOMENTOS) {
    let opcionesDelMomentoAcumuladas = [];
    // Filtrar categorías que coincidan con la momento.key actual
    // Esto es crucial: solo tomamos las categorías que getMomentoKey asignó correctamente
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

    // Rellenar o truncar para que haya exactamente una opción por día (o null)
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
  return menuPorDia;
}

// Renderiza la tabla (lógica de D&D y hover como tu original)
function renderMenuTable(menuData) {
  currentMenuPorDia = menuData; // Actualiza el estado global
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
      const opcion = currentMenuPorDia[d]?.[momento.key];

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

            const temp = currentMenuPorDia[sourceDia][momento.key];
            currentMenuPorDia[sourceDia][momento.key] =
              currentMenuPorDia[targetDia][momento.key];
            currentMenuPorDia[targetDia][momento.key] = temp;
            renderMenuTable(currentMenuPorDia);
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

  document.getElementById("exportPDFBtn").disabled = false;
  document.getElementById("exportImgBtn").disabled = false;
}

// Exportar a PDF
function exportToPDF() {
  const menuTableElement = document.querySelector("#menuTable .menu-table");
  if (!menuTableElement) return;

  const appMain = document.querySelector(".app-main");
  const originalAppMainOverflow = appMain.style.overflowY;
  appMain.style.overflowY = "visible";
  const menuTableContainer = document.getElementById("menuTableContainer");
  const originalTableContainerOverflow = menuTableContainer.style.overflowX;
  menuTableContainer.style.overflowX = "visible";

  html2canvas(menuTableElement, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: getComputedStyle(document.body)
      .getPropertyValue("--bg-table")
      .trim(),
  })
    .then((canvas) => {
      appMain.style.overflowY = originalAppMainOverflow;
      menuTableContainer.style.overflowX = originalTableContainerOverflow;

      const pageWidth = 8.5 * 72;
      const pageHeight = 11 * 72;
      const margin = 0.5 * 72;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;
      let imgWidth = canvas.width;
      let imgHeight = canvas.height;
      let ratio = imgWidth / imgHeight;

      if (imgWidth > availableWidth) {
        imgWidth = availableWidth;
        imgHeight = imgWidth / ratio;
      }
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * ratio;
      }
      if (imgWidth > availableWidth) {
        imgWidth = availableWidth;
        imgHeight = imgWidth / ratio;
      }

      const pdf = new window.jspdf.jsPDF({
        orientation: imgWidth > imgHeight ? "landscape" : "portrait",
        unit: "pt",
        format: "letter",
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        imgWidth,
        imgHeight
      );
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    })
    .catch((err) => {
      console.error("Error al exportar a PDF:", err);
      appMain.style.overflowY = originalAppMainOverflow;
      menuTableContainer.style.overflowX = originalTableContainerOverflow;
    });
}

// Exportar a imagen PNG
function exportToImage() {
  const menuTableElement = document.querySelector("#menuTable .menu-table");
  if (!menuTableElement) return;

  const appMain = document.querySelector(".app-main");
  const originalAppMainOverflow = appMain.style.overflowY;
  appMain.style.overflowY = "visible";
  const menuTableContainer = document.getElementById("menuTableContainer");
  const originalTableContainerOverflow = menuTableContainer.style.overflowX;
  menuTableContainer.style.overflowX = "visible";

  html2canvas(menuTableElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: getComputedStyle(document.body)
      .getPropertyValue("--bg-table")
      .trim(),
  })
    .then((canvas) => {
      appMain.style.overflowY = originalAppMainOverflow;
      menuTableContainer.style.overflowX = originalTableContainerOverflow;

      const dataUrl = canvas.toDataURL("image/png");
      const win = window.open();
      win.document.write(
        `<html><head><title>Menu Semanal</title></head><body style="margin:0;background:var(--bg-main); display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${dataUrl}" style="max-width:100%;max-height:100vh;display:block;"/></body></html>`
      );
    })
    .catch((err) => {
      console.error("Error al exportar a Imagen:", err);
      appMain.style.overflowY = originalAppMainOverflow;
      menuTableContainer.style.overflowX = originalTableContainerOverflow;
    });
}

// Eventos y control de visibilidad
document.addEventListener("DOMContentLoaded", () => {
  const inputText = document.getElementById("inputText");
  const inputArea = document.querySelector(".input-area");
  const menuTableContainer = document.getElementById("menuTableContainer");
  const parseBtn = document.getElementById("parseBtn");
  const exportPDFBtn = document.getElementById("exportPDFBtn");
  const exportImgBtn = document.getElementById("exportImgBtn");

  inputArea.classList.remove("hidden");
  menuTableContainer.classList.add("hidden");

  parseBtn.addEventListener("click", () => {
    const text = inputText.value;
    if (!text.trim()) {
      alert("Por favor, pega el texto del menú antes de procesar.");
      inputArea.classList.remove("hidden");
      menuTableContainer.classList.add("hidden");
      exportPDFBtn.disabled = true;
      exportImgBtn.disabled = true;
      return;
    }
    const parsedMenu = parseMenu(text);
    renderMenuTable(parsedMenu);

    inputArea.classList.add("hidden");
    menuTableContainer.classList.remove("hidden");
  });

  exportPDFBtn.addEventListener("click", () => {
    if (Object.keys(currentMenuPorDia).length === 0 || !currentMenuPorDia[0]) { // Chequeo más robusto
      alert("Primero procesa un menú para poder exportarlo.");
      return;
    }
    exportToPDF();
  });

  exportImgBtn.addEventListener("click", () => {
    if (Object.keys(currentMenuPorDia).length === 0 || !currentMenuPorDia[0]) { // Chequeo más robusto
      alert("Primero procesa un menú para poder exportarlo.");
      return;
    }
    exportToImage();
  });
});