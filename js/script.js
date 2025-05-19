const MOMENTOS = [
  { key: "desayuno", label: "Desayuno", aliases: ["desayuno"] },
  { key: "colacion1", label: "Colación / Snack 1", aliases: ["colación", "colacion", "snack"] },
  { key: "comida", label: "Comida", aliases: ["comida"] },
  { key: "colacion2", label: "Colación / Snack 2", aliases: ["colación", "colacion", "snack"] },
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

// Detecta el momento del día por nombre de sección
function getMomentoKey(sectionName, usedMoments) {
  const name = sectionName.trim().toLowerCase();
  for (const momento of MOMENTOS) {
    if (
      momento.aliases.some((alias) =>
        name.startsWith(alias)
      )
    ) {
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
  // Si no se encuentra, asigna a un momento genérico
  return `momento${usedMoments.length}`;
}

// Utilidad para parsear el texto a estructura de datos por momento y días
function parseMenu(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const categorias = [];
  let currentCategoria = null;
  let currentOpcion = null;
  let currentPlatillo = null;
  let usedMoments = [];

  for (let line of lines) {
    if (!line.trim()) continue;

    // Categoría (sin indentación)
    if (/^[^\s]/.test(line)) {
      const momentoKey = getMomentoKey(line.trim(), usedMoments);
      usedMoments.push(momentoKey);
      currentCategoria = {
        name: line.trim(),
        momentoKey,
        options: [],
      };
      categorias.push(currentCategoria);
      currentOpcion = null;
      currentPlatillo = null;
      continue;
    }

    // Opción (2 espacios)
    if (/^  [^\s]/.test(line)) {
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
    if (/^    [^\s]/.test(line)) {
      currentPlatillo = {
        name: line.trim(),
        ingredients: [],
      };
      currentOpcion.dishes.push(currentPlatillo);
      continue;
    }

    // Ingrediente (6 espacios)
    if (/^      [^\s]/.test(line)) {
      const ingMatch = line
        .trim()
        .match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
      if (ingMatch) {
        currentPlatillo.ingredients.push({
          name: ingMatch[1].trim(),
          qty: ingMatch[2].trim(),
          unit: ingMatch[3].trim(),
        });
      }
      continue;
    }
  }

  // Distribuye las opciones por días para cada momento
  const menuPorDia = {};
  for (let i = 0; i < 7; i++) {
    menuPorDia[i] = {};
  }

  // Mapea por momentoKey, no por índice
  for (const momento of MOMENTOS) {
    const cat = categorias.find(
      (c) => c.momentoKey === momento.key
    );
    let opciones = [];
    if (cat) {
      cat.options.forEach((op) => {
        for (let i = 0; i < op.days; i++) {
          opciones.push(op);
        }
      });
    }
    // Si hay menos de 7, rellena con vacío
    while (opciones.length < 7) opciones.push(null);
    // Si hay más de 7, recorta
    opciones = opciones.slice(0, 7);
    for (let d = 0; d < 7; d++) {
      menuPorDia[d][momento.key] = opciones[d];
    }
  }

  return menuPorDia;
}

// Renderiza la tabla tipo calendario semanal
function renderMenuTable(menuPorDia) {
  const menuTableDiv = document.getElementById("menuTable");
  menuTableDiv.innerHTML = "";

  // Crea la tabla
  const table = document.createElement("table");
  table.className = "menu-table";

  // Encabezado
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const thEmpty = document.createElement("th");
  thEmpty.textContent = "";
  headRow.appendChild(thEmpty);
  DIAS.forEach((dia) => {
    const th = document.createElement("th");
    th.textContent = dia;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Cuerpo
  const tbody = document.createElement("tbody");

  MOMENTOS.forEach((momento, mIdx) => {
    const tr = document.createElement("tr");
    tr.className = `row-${momento.key}`;

    // Etiqueta del momento
    const tdLabel = document.createElement("td");
    tdLabel.className = "moment-label";
    tdLabel.textContent = momento.label;
    tr.appendChild(tdLabel);

    // Celdas de los días
    for (let d = 0; d < 7; d++) {
      const td = document.createElement("td");
      const opcion = menuPorDia[d][momento.key];
      if (opcion) {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.setAttribute("draggable", "true");
        card.dataset.momento = momento.key;
        card.dataset.dia = d;

        // Drag events
        card.addEventListener("dragstart", (e) => {
          card.classList.add("dragging");
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              momento: momento.key,
              dia: d,
            })
          );
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
          const data = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (
            data.momento === momento.key &&
            data.dia != d
          ) {
            // Swap
            const temp = menuPorDia[data.dia][momento.key];
            menuPorDia[data.dia][momento.key] = menuPorDia[d][momento.key];
            menuPorDia[d][momento.key] = temp;
            renderMenuTable(menuPorDia);
          }
        });

        // Visual feedback
        card.addEventListener("mouseenter", () => {
          card.style.boxShadow =
            "0 0 0 3px #4f8cff55, 0 2px 8px #0001";
        });
        card.addEventListener("mouseleave", () => {
          card.style.boxShadow = "";
        });

        // Card content
        const optTitle = document.createElement("div");
        optTitle.className = "option-title";
        optTitle.textContent = opcion.title;
        card.appendChild(optTitle);

        const dishesList = document.createElement("ul");
        dishesList.className = "dishes-list";
        opcion.dishes.forEach((dish) => {
          const dishLi = document.createElement("li");
          const dishTitle = document.createElement("div");
          dishTitle.className = "dish-title";
          dishTitle.textContent = dish.name;
          dishLi.appendChild(dishTitle);

          if (dish.ingredients.length) {
            const ingList = document.createElement("ul");
            ingList.className = "ingredients-list";
            dish.ingredients.forEach((ing) => {
              const ingLi = document.createElement("li");
              ingLi.textContent = `${ing.name} | ${ing.qty} | ${ing.unit}`;
              ingList.appendChild(ingLi);
            });
            dishLi.appendChild(ingList);
          }
          dishesList.appendChild(dishLi);
        });
        card.appendChild(dishesList);

        td.appendChild(card);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  menuTableDiv.appendChild(table);

  // Habilita exportar
  document.getElementById("exportPDFBtn").disabled = false;
  document.getElementById("exportImgBtn").disabled = false;
}

// Exportar a PDF usando html2canvas + jsPDF
function exportToPDF() {
  const menuTable = document.getElementById("menuTable");
  html2canvas(menuTable, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    scrollY: -window.scrollY,
  }).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new window.jspdf.jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(
      imgData,
      "PNG",
      20,
      20,
      imgWidth,
      imgHeight > pageHeight - 40 ? pageHeight - 40 : imgHeight
    );
    pdf.save("menu-semanal.pdf");
  });
}

// Exportar a imagen PNG
function exportToImage() {
  const menuTable = document.getElementById("menuTable");
  html2canvas(menuTable, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    scrollY: -window.scrollY,
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = "menu-semanal.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

// Eventos
document.addEventListener("DOMContentLoaded", () => {
  let menuPorDia = {};

  document.getElementById("parseBtn").addEventListener("click", () => {
    const text = document.getElementById("inputText").value;
    menuPorDia = parseMenu(text);
    renderMenuTable(menuPorDia);
  });

  document
    .getElementById("exportPDFBtn")
    .addEventListener("click", exportToPDF);

  document
    .getElementById("exportImgBtn")
    .addEventListener("click", exportToImage);
});