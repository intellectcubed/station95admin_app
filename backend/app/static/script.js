async function loadDate() {
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');
  const res = await fetch(`/api?action=get_schedule_day&date=${date}`);
  const json = await res.json();
  renderGrid("currentGrid", json);
  renderGrid("previewGrid", json); // Also populate preview table on initialization
  
  // Refresh backups when date changes
  await loadBackups(date);
}

async function initDate() {
  const datePicker = document.getElementById("datePicker");
  datePicker.value = new Date().toISOString().slice(0,10);
  await loadDate();
  
  // Load backups for the current date
  const date = datePicker.value.replace(/-/g, '');
  await loadBackups(date);
}

function initTimeDropdowns() {
  const startTime = document.getElementById("startTime");
  const endTime = document.getElementById("endTime");
  
  for (let hour = 0; hour < 24; hour++) {
    const time = hour.toString().padStart(2, '0') + '00';
    
    const startOption = document.createElement("option");
    startOption.value = time;
    startOption.textContent = time;
    startTime.appendChild(startOption);
    
    const endOption = document.createElement("option");
    endOption.value = time;
    endOption.textContent = time;
    endTime.appendChild(endOption);
  }
}

function onQuickSelectChange() {
  const quickSelect = document.getElementById("quickSelect");
  const range = quickSelect.value;
  
  if (!range) return;
  
  const [start, end] = range.split("-");
  document.getElementById("startTime").value = start;
  document.getElementById("endTime").value = end;
}

function onManualChange() {
  document.getElementById("quickSelect").value = "";
}

window.onload = async function() {
  initTimeDropdowns();
  await initDate();
};

function renderGrid(id, json) {
  const table = document.getElementById(id);
  table.innerHTML = "";
  
  // Handle both 'grid' and 'modified_grid' fields
  const grid = json.grid || json.modified_grid;
  
  if (!grid) return;
  
  const isPreviewTable = (id === "previewGrid");
  
  // Add header row
  const headerRow = document.createElement("tr");
  ["Shift", "Tango", "Squad 1", "Squad 2", "Squad 3"].forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  
  // Render data rows (skip first row - grid[0])
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const tr = document.createElement("tr");
    
    // Check if row is empty
    if (row.every(cell => !cell || !cell.trim())) {
      for (let j = 0; j < 5; j++) {
        tr.appendChild(document.createElement("td"));
      }
      table.appendChild(tr);
      continue;
    }
    
    // Parse shift info (column 0)
    const shiftInfo = row[0] ? row[0].split("\n") : ["", ""];
    const shift = shiftInfo[0] || "";
    const tangoMatch = shiftInfo[1] ? shiftInfo[1].match(/Tango:\s*(\d+)/) : null;
    const tango = tangoMatch ? tangoMatch[1] : "";
    
    // Add Shift column
    const shiftTd = document.createElement("td");
    shiftTd.textContent = shift;
    tr.appendChild(shiftTd);
    
    // Add Tango column
    const tangoTd = document.createElement("td");
    tangoTd.textContent = tango;
    tr.appendChild(tangoTd);
    
    // Add Squad columns (columns 1-3)
    for (let j = 1; j <= 3; j++) {
      const td = document.createElement("td");
      if (row[j]) {
        td.innerHTML = row[j].split("\n").join("<br>");
      }
      tr.appendChild(td);
    }
    
    // Add click handler for preview table rows
    if (isPreviewTable) {
      tr.style.cursor = "pointer";
      tr.onclick = function() {
        // Extract squad assignments from the row
        const assignments = extractSquadAssignments(row);
        
        // Extract shift interval from the shift column
        const shiftInterval = shift || "";
        
        // Highlight selected row
        document.querySelectorAll("#previewGrid tr").forEach(r => {
          r.style.backgroundColor = "";
        });
        tr.style.backgroundColor = "#e0e0e0";
        
        // Call initializeTerritories with the assignments and shift interval
        if (Object.keys(assignments).length > 0) {
          initializeTerritories(assignments, shiftInterval);
        }
      };
    }
    
    table.appendChild(tr);
  }
}

function extractSquadAssignments(row) {
  const assignments = {};
  
  // Parse squad columns (columns 1-3)
  for (let j = 1; j <= 3; j++) {
    if (!row[j] || !row[j].trim()) continue;
    
    // Extract squad numbers from the cell content
    // Format is typically "Squad XX" or just "XX"
    const squadMatches = row[j].match(/\b(\d{2})\b/g);
    
    if (squadMatches && squadMatches.length > 0) {
      // First squad number is the primary squad
      const primarySquad = parseInt(squadMatches[0]);
      
      // All squad numbers in this cell are territories for this primary squad
      const territories = squadMatches.map(s => parseInt(s));
      
      assignments[primarySquad] = territories;
    }
  }
  
  return assignments;
}

async function preview_button() {
  const cmd = document.getElementById("command").value;
  const squad = document.getElementById("squad").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');
  
  // Validation
  if (!cmd) {
    document.getElementById("output").textContent = "Error: Command must be selected";
    return;
  }
  if (!squad) {
    document.getElementById("output").textContent = "Error: Squad must be selected";
    return;
  }
  if (!start || !end) {
    document.getElementById("output").textContent = "Error: Both start and end times must be selected";
    return;
  }
  
  try {
    const url = `/api?action=${cmd}&date=${date}&shift_start=${start}&shift_end=${end}&squad=${squad}&preview=True`;
    console.log("Preview URL:", url);
    const res = await fetch(url);
    const text = await res.text();
    console.log("Preview response:", text);
    
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      document.getElementById("output").textContent = "Error: Invalid JSON response - " + text;
      return;
    }
    
    console.log("Preview JSON:", json);
    renderGrid("previewGrid", json);
    document.getElementById("output").textContent = "Preview generated";
  } catch (error) {
    console.error("Preview error:", error);
    document.getElementById("output").textContent = "Error: " + error.message;
  }
}

async function revert() {
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');
  
  const res = await fetch(`/api?action=get_schedule_day&date=${date}`);
  const json = await res.json();
  renderGrid("previewGrid", json);
  document.getElementById("output").textContent = "Preview reverted to current state";
}

async function apply() {
  const cmd = document.getElementById("command").value;
  const squad = document.getElementById("squad").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');
  
  // Validation
  if (!cmd) {
    document.getElementById("output").textContent = "Error: Command must be selected";
    return;
  }
  if (!squad) {
    document.getElementById("output").textContent = "Error: Squad must be selected";
    return;
  }
  if (!start || !end) {
    document.getElementById("output").textContent = "Error: Both start and end times must be selected";
    return;
  }
  
  const url = `/api?action=${cmd}&date=${date}&shift_start=${start}&shift_end=${end}&squad=${squad}&preview=False`;
  const res = await fetch(url);
  const json = await res.json();
  
  // Update Current grid
  renderGrid("currentGrid", json);
  
  // Clear Preview grid
  document.getElementById("previewGrid").innerHTML = "";
  
  // Refresh backups list
  await loadBackups(date);
  
  document.getElementById("output").textContent = "Changes applied successfully";
}

async function loadBackups(date) {
  const res = await fetch(`/api?action=list_backups&date=${date}`);
  const json = await res.json();
  
  const backupsBody = document.getElementById("backupsBody");
  backupsBody.innerHTML = "";
  
  if (!json.backups || json.backups.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No backups available";
    tr.appendChild(td);
    backupsBody.appendChild(tr);
    return;
  }
  
  // Show up to 20 backups
  const backups = json.backups.slice(0, 20);
  backups.forEach(backup => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    
    // Add click handler to populate backup ID
    tr.onclick = function() {
      document.getElementById("backupId").value = backup.id || "";
      // Highlight selected row
      document.querySelectorAll("#backupsBody tr").forEach(row => {
        row.style.backgroundColor = "";
      });
      tr.style.backgroundColor = "#e0e0e0";
    };
    
    const idTd = document.createElement("td");
    idTd.textContent = backup.id || "";
    tr.appendChild(idTd);
    
    const descTd = document.createElement("td");
    descTd.textContent = backup.description || "";
    tr.appendChild(descTd);
    
    const cmdTd = document.createElement("td");
    cmdTd.textContent = backup.command || "";
    tr.appendChild(cmdTd);
    
    backupsBody.appendChild(tr);
  });
}

async function restore() {
  const backupId = document.getElementById("backupId").value;
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');
  
  if (!backupId) {
    document.getElementById("output").textContent = "Error: Please select a backup to restore";
    return;
  }
  
  try {
    const url = `/api?action=rollback&date=${date}&change_id=${backupId}`;
    console.log("Restore URL:", url);
    const res = await fetch(url);
    const json = await res.json();
    
    console.log("Restore response:", json);
    document.getElementById("output").textContent = "Backup restored successfully";
    
    // Refresh the page data
    await loadDate();
    
    // Clear the backup ID selection
    document.getElementById("backupId").value = "";
    document.querySelectorAll("#backupsBody tr").forEach(row => {
      row.style.backgroundColor = "";
    });
  } catch (error) {
    console.error("Restore error:", error);
    document.getElementById("output").textContent = "Error: " + error.message;
  }
}


function updatePreviewGridWithTerritories(shiftInterval, assignments) {
  const previewTable = document.getElementById("previewGrid");
  const rows = previewTable.querySelectorAll("tr");
  
  if (rows.length === 0) {
    alert("Preview grid is empty. Please generate a preview first.");
    return;
  }
  
  // Parse shift interval (e.g., "1800 - 0600" or "0600-1800")
  const intervalMatch = shiftInterval.match(/(\d{4})\s*-\s*(\d{4})/);
  if (!intervalMatch) {
    alert("Invalid shift interval format: " + shiftInterval);
    return;
  }
  
  const startTime = intervalMatch[1];
  const endTime = intervalMatch[2];
  
  // Find the matching row in the preview grid
  let targetRow = null;
  for (let i = 1; i < rows.length; i++) { // Skip header row
    const row = rows[i];
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) continue;
    
    const shiftCell = cells[0].textContent.trim();
    
    // Check if this row matches the shift interval
    if (shiftCell.includes(startTime) && shiftCell.includes(endTime)) {
      targetRow = row;
      break;
    }
  }
  
  if (!targetRow) {
    alert(`Could not find shift row for interval: ${shiftInterval}`);
    return;
  }
  
  // Sort squads by key
  const sortedSquads = Object.keys(assignments).sort((a, b) => parseInt(a) - parseInt(b));
  
  // Update the squad columns (columns 2, 3, 4 - indices 2, 3, 4)
  const cells = targetRow.querySelectorAll("td");
  
  for (let i = 0; i < 3 && i < sortedSquads.length; i++) {
    const squad = sortedSquads[i];
    const territories = assignments[squad];
    
    // Format: "XX\n[XX, YY, ZZ]"
    const squadText = squad;
    const territoriesText = `[${territories.join(", ")}]`;
    const cellContent = `${squadText}<br>${territoriesText}`;
    
    // Update cell (index is i + 2 because first two columns are Shift and Tango)
    if (cells[i + 2]) {
      cells[i + 2].innerHTML = cellContent;
    }
  }
  
  // Clear any remaining squad columns if there are fewer squads than columns
  for (let i = sortedSquads.length; i < 3; i++) {
    if (cells[i + 2]) {
      cells[i + 2].innerHTML = "";
    }
  }
  
  document.getElementById("output").textContent = `Preview updated for shift ${shiftInterval}`;
}
