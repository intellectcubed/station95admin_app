// Global state variables for schedule management
let current_schedule_day = null;
let working_schedule_day = null;
let commandHistory = [];

// Helper functions for loading state
function showLoading(message) {
  const output = document.getElementById("output");
  output.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
}

function showMessage(message) {
  const output = document.getElementById("output");
  output.innerHTML = `<span>${message}</span>`;
}

async function loadDate() {
  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');

  showLoading("Loading schedule...");

  const res = await fetch(`/api?action=get_schedule_day&date=${date}`);
  const json = await res.json();

  // Parse the day_schedule JSON string from the response
  if (json.day_schedule) {
    const scheduleData = JSON.parse(json.day_schedule);
    current_schedule_day = scheduleData;
    working_schedule_day = JSON.parse(JSON.stringify(scheduleData)); // Deep copy
  }
  
  // Clear command history when loading a new date
  commandHistory = [];

  renderGrid("currentGrid", current_schedule_day);
  renderGrid("previewGrid", working_schedule_day);

  // Refresh backups when date changes
  await loadBackups(date);

  showMessage("Schedule loaded successfully");
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

function renderGrid(id, scheduleData) {
  const table = document.getElementById(id);
  table.innerHTML = "";

  if (!scheduleData || !scheduleData.shifts) return;

  const isPreviewTable = (id === "previewGrid");

  // Add title row (Current or Preview)
  const titleRow = document.createElement("tr");
  const titleCell = document.createElement("th");
  titleCell.colSpan = 5;
  titleCell.textContent = isPreviewTable ? "Preview" : "Current";
  titleCell.style.textAlign = "center";
  titleRow.appendChild(titleCell);
  table.appendChild(titleRow);

  // Add header row
  const headerRow = document.createElement("tr");
  ["Shift", "Tango", "Squad 1", "Squad 2", "Squad 3"].forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Render data rows from shifts
  scheduleData.shifts.forEach(shift => {
    shift.segments.forEach(segment => {
      const tr = document.createElement("tr");

      // Format times (remove colons: "18:00" -> "1800")
      const startTime = segment.start_time.replace(":", "");
      const endTime = segment.end_time.replace(":", "");

      // Add Shift column (HHMM - HHMM)
      const shiftTd = document.createElement("td");
      shiftTd.textContent = `${startTime} - ${endTime}`;
      tr.appendChild(shiftTd);

      // Add Tango column
      const tangoTd = document.createElement("td");
      tangoTd.textContent = shift.tango || "";
      tr.appendChild(tangoTd);

      // Check if segment has squads
      if (!segment.squads || segment.squads.length === 0) {
        // No squads - show "Out of Service"
        const td = document.createElement("td");
        td.colSpan = 3;
        td.innerHTML = "<strong style='color: red;'>Out of Service</strong>";
        tr.appendChild(td);
      } else {
        // Add Squad columns (up to 3 squads)
        for (let i = 0; i < 3; i++) {
          const td = document.createElement("td");

          if (i < segment.squads.length) {
            const squad = segment.squads[i];
            const squadId = squad.id;

            // Check if squad is inactive or has no territories
            if (!squad.active || !squad.territories || squad.territories.length === 0) {
              td.innerHTML = `${squadId}<br><span style='color: red;'>[No Crew]</span>`;
            } else {
              const territories = squad.territories.join(", ");
              td.innerHTML = `${squadId}<br>[${territories}]`;
            }
          }

          tr.appendChild(td);
        }
      }

      // Add click handler for preview table rows
      if (isPreviewTable) {
        tr.style.cursor = "pointer";
        tr.onclick = function() {
          // Extract squad assignments from the segment
          const assignments = {};
          if (segment.squads) {
            segment.squads.forEach(squad => {
              if (squad.active && squad.territories && squad.territories.length > 0) {
                assignments[squad.id] = squad.territories;
              }
            });
          }

          const shiftInterval = `${startTime} - ${endTime}`;

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
    });
  });
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
    showMessage("Error: Command must be selected");
    return;
  }
  if (!squad) {
    showMessage("Error: Squad must be selected");
    return;
  }
  if (!start || !end) {
    showMessage("Error: Both start and end times must be selected");
    return;
  }
  if (!working_schedule_day) {
    showMessage("Error: No schedule loaded to preview");
    return;
  }

  try {
    showLoading(`Generating preview for ${cmd} on squad ${squad}...`);

    // Build the POST payload
    const payload = {
      action: cmd,
      date: date,
      shift_start: start,
      shift_end: end,
      squad: parseInt(squad),
      day_schedule: JSON.stringify(working_schedule_day)
    };

    const url = `/calendar/day/${date}/preview`;
    console.log("Preview URL:", url);
    console.log("Preview payload:", payload);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Preview response:", text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      showMessage("Error: Invalid JSON response - " + text);
      return;
    }

    console.log("Preview JSON:", json);

    // Parse the modified_grid or day_schedule JSON string and update working_schedule_day
    const scheduleSource = json.modified_grid || json.day_schedule;
    if (scheduleSource) {
      const scheduleData = JSON.parse(scheduleSource);
      working_schedule_day = scheduleData;
      renderGrid("previewGrid", working_schedule_day);
      
      // Track the command in history
      const commandString = `${cmd}[${squad}] ${start} - ${end}`;
      commandHistory.push(commandString);
      console.log("Command history:", commandHistory);
      
      showMessage("Preview generated successfully");
    } else {
      showMessage("Error: No schedule data in response");
    }
  } catch (error) {
    console.error("Preview error:", error);
    showMessage("Error: " + error.message);
  }
}

async function revert() {
  // Restore working_schedule_day from current_schedule_day
  if (current_schedule_day) {
    working_schedule_day = JSON.parse(JSON.stringify(current_schedule_day)); // Deep copy
    renderGrid("previewGrid", working_schedule_day);
    
    // Clear command history when reverting
    commandHistory = [];
    console.log("Command history cleared");
    
    showMessage("Preview reverted to current state");
  } else {
    showMessage("Error: No current schedule loaded");
  }
}

function showState() {
  if (working_schedule_day) {
    // Create JSON string with pretty formatting
    const jsonString = JSON.stringify(working_schedule_day, null, 2);

    // Create a blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a temporary download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'PreviewState.json';

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);

    showMessage("Preview state downloaded as PreviewState.json");
  } else {
    showMessage("No working schedule data loaded");
  }
}

async function apply() {
  showLoading(`Applying changes...`);

  const datePicker = document.getElementById("datePicker");
  const date = datePicker.value.replace(/-/g, '');

  // Build the POST payload with DaySchedule as a JSON string and commands
  const commandsString = commandHistory.join("; ");
  const payload = {
    DaySchedule: JSON.stringify(working_schedule_day),
    commands: commandsString
  };

  const url = `/calendar/day/${date}/apply`;
  console.log("Apply URL:", url);
  console.log("Apply payload:", payload);
  console.log("Commands being applied:", commandsString);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log("Apply response:", json);

    // Check if the response indicates success
    if (json.success) {
      // Format date for display (YYYYMMDD -> YYYY-MM-DD)
      const formattedDate = json.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      showMessage(`Date updated: ${formattedDate} ChangeId created: ${json.changeId}`);

      // Clear command history after successful apply
      commandHistory = [];

      // Reload the schedule to get the updated data
      await loadDate();
    } else {
      showMessage("Error: Apply operation failed");
    }
  } catch (error) {
    console.error("Apply error:", error);
    showMessage("Error: " + error.message);
  }
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
    showMessage("Error: Please select a backup to restore");
    return;
  }

  try {
    showLoading(`Restoring backup ${backupId}...`);

    const url = `/api?action=rollback&date=${date}&change_id=${backupId}`;
    console.log("Restore URL:", url);
    const res = await fetch(url);
    const json = await res.json();

    console.log("Restore response:", json);

    // Refresh the page data
    await loadDate();

    // Clear the backup ID selection
    document.getElementById("backupId").value = "";
    document.querySelectorAll("#backupsBody tr").forEach(row => {
      row.style.backgroundColor = "";
    });

    showMessage("Backup restored successfully");
  } catch (error) {
    console.error("Restore error:", error);
    showMessage("Error: " + error.message);
  }
}


function updatePreviewGridWithTerritories(shiftInterval, assignments) {
  if (!working_schedule_day || !working_schedule_day.shifts) {
    alert("No schedule data loaded.");
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

  // Format times with colon for comparison (1800 -> 18:00)
  const formattedStart = startTime.slice(0, 2) + ":" + startTime.slice(2);
  const formattedEnd = endTime.slice(0, 2) + ":" + endTime.slice(2);

  // Find the matching segment in working_schedule_day
  let foundSegment = null;
  for (const shift of working_schedule_day.shifts) {
    for (const segment of shift.segments) {
      if (segment.start_time === formattedStart && segment.end_time === formattedEnd) {
        foundSegment = segment;
        break;
      }
    }
    if (foundSegment) break;
  }

  if (!foundSegment) {
    alert(`Could not find shift segment for interval: ${shiftInterval}`);
    return;
  }

  // Update the segment's squads with new territory assignments
  const sortedSquads = Object.keys(assignments).sort((a, b) => parseInt(a) - parseInt(b));
  foundSegment.squads = sortedSquads.map(squadId => {
    return {
      id: parseInt(squadId),
      territories: assignments[squadId],
      active: true
    };
  });

  // Re-render the preview grid with updated data
  renderGrid("previewGrid", working_schedule_day);

  document.getElementById("output").textContent = `Preview updated for shift ${shiftInterval}`;
}
