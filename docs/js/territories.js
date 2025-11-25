   const ALL_SQUADS = [34, 35, 42, 43, 54];
    let assignments = {};
    let shiftInterval = "";
    let originalAssignments = {};

    function dedupAndSort(arr) {
      if (!arr || arr.length === 0) return arr;

      const first = arr[0];
      const rest = arr.slice(1);

      // remove any occurrence of the first element in the rest
      const filtered = rest.filter(x => x !== first);

      // sort the remaining elements
      filtered.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));

      // combine and return
      return [first, ...filtered];
    }

    // Initialize with assignments object and optional shift interval
    // input: assignments object like {"34": [34, 35], "42": [42, 43, 54]}
    // interval: shift interval string like "1800 - 0600" (optional)
    function initializeTerritories(input, interval) {
      if (typeof input === 'object' && !Array.isArray(input)) {
        assignments = {};
        for (const [squad, territories] of Object.entries(input)) {
          const squadNum = parseInt(squad);
          let territoryNums = territories.map(t => parseInt(t));

          // Ensure squad's own territory is first (primary), then sort the rest
          const ownTerritoryIndex = territoryNums.indexOf(squadNum);
          if (ownTerritoryIndex > -1) {
            // Remove own territory from current position
            territoryNums.splice(ownTerritoryIndex, 1);
            // Add own territory at the beginning
            territoryNums.unshift(squadNum);
          }

          // Deduplicate and sort the remaining (non-primary) territories
          const primaryTerritory = territoryNums[0];
          const otherTerritories = [...new Set(territoryNums.slice(1))].sort((a, b) => a - b);

          assignments[squadNum] = [primaryTerritory, ...otherTerritories];
        }

        // Store original assignments for reset functionality
        originalAssignments = JSON.parse(JSON.stringify(assignments));

        // Store shift interval if provided
        if (interval) {
          shiftInterval = interval;
        }
      }

      renderAssignments();
    }

    function renderAssignments() {
      const container = document.getElementById('squadSections');
      container.innerHTML = '';

      Object.keys(assignments).sort((a, b) => a - b).forEach(squad => {
        const section = document.createElement('div');
        section.className = 'squad-section';
        
        const header = document.createElement('div');
        header.className = 'squad-header';
        
        const squadName = document.createElement('div');
        squadName.className = 'squad-name';
        squadName.textContent = `Squad ${squad}`;
        
        header.appendChild(squadName);
        section.appendChild(header);

        const pillsContainer = document.createElement('div');
        pillsContainer.className = 'territory-pills';
        pillsContainer.dataset.squad = squad;
        
        // Add drag and drop events
        pillsContainer.addEventListener('dragover', handleDragOver);
        pillsContainer.addEventListener('drop', handleDrop);
        pillsContainer.addEventListener('dragleave', handleDragLeave);

        assignments[squad].forEach((territory, index) => {
          const pill = createTerritoryPill(territory, squad, territory === parseInt(squad));
          pillsContainer.appendChild(pill);
        });

        section.appendChild(pillsContainer);
        container.appendChild(section);
      });
    }

    function createTerritoryPill(territory, currentSquad, isPrimary) {
      const pill = document.createElement('div');
      pill.className = 'territory-pill' + (isPrimary ? ' primary' : '');
      pill.draggable = !isPrimary; // Primary territory can't be moved
      pill.dataset.territory = territory;
      pill.dataset.fromSquad = currentSquad;

      const label = document.createElement('span');
      label.textContent = territory;
      pill.appendChild(label);

      if (!isPrimary) {
        pill.addEventListener('dragstart', handleDragStart);
        pill.addEventListener('dragend', handleDragEnd);
      }

      return pill;
    }

    function handleDragStart(e) {
      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('territory', e.target.dataset.territory);
      e.dataTransfer.setData('fromSquad', e.target.dataset.fromSquad);
    }

    function handleDragEnd(e) {
      e.target.classList.remove('dragging');
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
      if (e.currentTarget === e.target) {
        e.currentTarget.classList.remove('drag-over');
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');

      const territory = parseInt(e.dataTransfer.getData('territory'));
      const fromSquad = parseInt(e.dataTransfer.getData('fromSquad'));
      const toSquad = parseInt(e.currentTarget.dataset.squad);

      if (fromSquad !== toSquad) {
        // Remove from old squad
        assignments[fromSquad] = assignments[fromSquad].filter(t => t !== territory);
        
        // Add to new squad
        if (!assignments[toSquad].includes(territory)) {
          assignments[toSquad].push(territory);
        }

        renderAssignments();
      }
    }

    function removeTerritory(squad, territory) {
      // Can't remove primary territory (squad's own territory)
      if (territory === parseInt(squad)) {
        alert('Cannot remove primary territory');
        return;
      }

      assignments[squad] = assignments[squad].filter(t => t !== territory);
      renderAssignments();
    }

    function resetAssignments() {
      console.log('Resetting to original assignments:', originalAssignments);
      assignments = JSON.parse(JSON.stringify(originalAssignments));
      renderAssignments();
    }

    function getAssignments() {
      console.log('Current assignments:', assignments);
      alert(JSON.stringify(assignments, null, 2));
      return assignments;
    }

    function previewTerritories() {
      if (Object.keys(assignments).length === 0) {
        alert('No territory assignments to preview. Please click on a shift row first.');
        return;
      }
      
      if (!shiftInterval) {
        alert('No shift interval set. Please click on a shift row first.');
        return;
      }
      
      console.log('Previewing territories for shift:', shiftInterval);
      console.log('Current assignments:', assignments);
      
      // Call the script.js function to update the preview grid
      updatePreviewGridWithTerritories(shiftInterval, assignments);
    }

    // Example: Initialize with 3 squads on duty
    // initializeTerritories([42, 54]);