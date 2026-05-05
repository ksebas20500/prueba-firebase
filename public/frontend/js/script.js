/**
 * Simulador de Autómatas Finitos - script.js
 * Gestiona el canvas interactivo y la comunicación con el backend.
 */

let cy = null;
let transitions = [];
let simulationHistory = [];
let currentStepIndex = -1;
let isPlaying = false;
let playInterval = null;

// Configuración inicial de Cytoscape
document.addEventListener('DOMContentLoaded', () => {
    initCytoscape();
    setupEventListeners();
    
    // Ejemplo inicial: Reconocedor de cadenas que terminan en '1'
    transitions = [
        { from: 'q0', symbol: '0', to: 'q0' },
        { from: 'q0', symbol: '1', to: 'q1' },
        { from: 'q1', symbol: '0', to: 'q0' },
        { from: 'q1', symbol: '1', to: 'q1' }
    ];
    renderTransitionsList();
    applyConfiguration();
});

function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#1e293b',
                    'label': 'data(id)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'width': '50px',
                    'height': '50px',
                    'border-width': 2,
                    'border-color': '#4f46e5'
                }
            },
            {
                selector: 'node.final',
                style: {
                    'border-width': 5,
                    'border-style': 'double',
                    'border-color': '#fff'
                }
            },
            {
                selector: 'node.initial',
                style: {
                    'background-color': '#4f46e5'
                }
            },
            {
                selector: 'node.active',
                style: {
                    'background-color': '#3b82f6',
                    'transition-property': 'background-color',
                    'transition-duration': '0.3s',
                    'scale': 1.2
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#4b5563',
                    'target-arrow-color': '#4b5563',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(symbol)',
                    'color': '#94a3b8',
                    'font-size': '14px',
                    'text-margin-y': -10
                }
            }
        ],
        layout: { name: 'grid', padding: 50 }
    });
}

function setupEventListeners() {
    // Añadir transición
    document.getElementById('add-transition').addEventListener('click', () => {
        const from = document.getElementById('trans-from').value.trim();
        const symbol = document.getElementById('trans-symbol').value.trim(); // ε es vacio
        const to = document.getElementById('trans-to').value.trim();

        if (from && to) {
            transitions.push({ from, symbol, to });
            renderTransitionsList();
            document.getElementById('trans-from').value = '';
            document.getElementById('trans-symbol').value = '';
            document.getElementById('trans-to').value = '';
        }
    });

    // Aplicar configuración
    document.getElementById('apply-config').addEventListener('click', applyConfiguration);

    // Controles de simulación
    document.getElementById('btn-play').addEventListener('click', startSimulation);
    document.getElementById('btn-pause').addEventListener('click', pauseSimulation);
    document.getElementById('btn-next').addEventListener('click', nextStep);
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);
}

function renderTransitionsList() {
    const list = document.getElementById('transitions-list');
    list.innerHTML = '';
    transitions.forEach((t, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>δ(${t.from}, ${t.symbol || 'ε'}) → ${t.to}</span>
            <button onclick="removeTransition(${index})" style="background:none; border:none; color:red; cursor:pointer;">×</button>
        `;
        list.appendChild(li);
    });
}

function removeTransition(index) {
    transitions.splice(index, 1);
    renderTransitionsList();
}

function applyConfiguration() {
    const statesStr = document.getElementById('states-input').value;
    const states = statesStr.split(',').map(s => s.trim());
    const finalStates = document.getElementById('final-states-input').value.split(',').map(s => s.trim());
    const initialState = document.getElementById('initial-state-input').value.trim();

    cy.elements().remove();

    states.forEach(id => {
        if (!id) return;
        let classes = '';
        if (id === initialState) classes += 'initial ';
        if (finalStates.includes(id)) classes += 'final';
        
        cy.add({
            group: 'nodes',
            data: { id: id },
            classes: classes,
            position: { x: Math.random() * 400, y: Math.random() * 400 }
        });
    });

    transitions.forEach((t, i) => {
        if (states.includes(t.from) && states.includes(t.to)) {
            cy.add({
                group: 'edges',
                data: { 
                    id: `e${i}`, 
                    source: t.from, 
                    target: t.to, 
                    symbol: t.symbol || 'ε' 
                }
            });
        }
    });

    cy.layout({ name: 'circle' }).run();
}

async function startSimulation() {
    if (currentStepIndex === -1) {
        // Nueva simulación
        const inputString = document.getElementById('input-string').value;
        const config = {
            states: document.getElementById('states-input').value.split(',').map(s => s.trim()),
            alphabet: document.getElementById('alphabet-input').value.split(',').map(s => s.trim()),
            transitions: transitions,
            initial_state: document.getElementById('initial-state-input').value.trim(),
            final_states: document.getElementById('final-states-input').value.split(',').map(s => s.trim()),
            input_string: inputString
        };

        try {
            const response = await fetch('http://127.0.0.1:5005/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                simulationHistory = data.history;
                currentStepIndex = 0;
                displayStep();
            } else {
                alert("Error: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("No se pudo conectar con el backend (asegúrate de que app.py esté corriendo)");
        }
    }

    if (!isPlaying) {
        isPlaying = true;
        playInterval = setInterval(() => {
            if (currentStepIndex < simulationHistory.length - 1) {
                nextStep();
            } else {
                pauseSimulation();
            }
        }, 1000);
    }
}

function pauseSimulation() {
    isPlaying = false;
    clearInterval(playInterval);
}

function nextStep() {
    if (currentStepIndex < simulationHistory.length - 1) {
        currentStepIndex++;
        displayStep();
    }
}

function resetSimulation() {
    pauseSimulation();
    currentStepIndex = -1;
    simulationHistory = [];
    cy.nodes().removeClass('active');
    const status = document.getElementById('status-display');
    status.innerText = 'Esperando cadena...';
    status.className = 'status-box';
}

function displayStep() {
    const step = simulationHistory[currentStepIndex];
    const status = document.getElementById('status-display');
    
    // Actualizar visualización en el canvas
    cy.nodes().removeClass('active');
    step.active_states.forEach(stateId => {
        cy.$id(stateId).addClass('active');
    });

    // Actualizar panel de estado
    if (step.error) {
        status.innerText = `Error: ${step.error}`;
        status.className = 'status-box rejected';
        pauseSimulation();
        return;
    }

    let msg = `Paso ${currentStepIndex}: `;
    if (step.symbol === null) {
        msg += "Estado inicial (Clausura-ε)";
    } else {
        msg += `Leyendo '${step.symbol}'`;
    }
    
    const isLastStep = currentStepIndex === simulationHistory.length - 1;
    if (isLastStep) {
        if (step.accepted) {
            msg += "\n✅ CADENA ACEPTADA";
            status.className = 'status-box accepted';
        } else {
            msg += "\n❌ CADENA RECHAZADA";
            status.className = 'status-box rejected';
        }
    } else {
        status.className = 'status-box';
    }
    
    status.innerText = msg;
}
