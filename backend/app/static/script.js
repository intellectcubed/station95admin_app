async function loadDate() {
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');
  const res = await fetch(`/api?action=get_schedule_day&date=${date}`);
  const json = await res.json();
  renderGrid("currentGrid", json);
  
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
    
    table.appendChild(tr);
  }
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

