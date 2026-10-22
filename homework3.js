const probabilityInput = document.getElementById("probability");
const trialsInput = document.getElementById("trials");
const speedSelect = document.getElementById("speed");
const startButton = document.getElementById("startBtn");
const resetButton = document.getElementById("resetBtn");

const completedValue = document.getElementById("completedValue");
const successValue = document.getElementById("successValue");
const failureValue = document.getElementById("failureValue");
const observedValue = document.getElementById("observedValue");
const theoreticalValue = document.getElementById("theoreticalValue");
const errorValue = document.getElementById("errorValue");
const finalResult = document.getElementById("finalResult");

let convergenceChart = null;
let simulationId = 0;

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function readParameters() {
    const probability = Number(probabilityInput.value);
    const trials = Number.parseInt(trialsInput.value, 10);
    const delay = Number.parseInt(speedSelect.value, 10);

    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
        throw new Error("The probability p must be between 0 and 1.");
    }

    if (!Number.isInteger(trials) || trials < 10 || trials > 10000) {
        throw new Error("The number of trials must be between 10 and 10,000.");
    }

    return { probability, trials, delay };
}

function createChart(probability) {
    if (convergenceChart) {
        convergenceChart.destroy();
    }

    const context = document
        .getElementById("convergenceChart")
        .getContext("2d");

    convergenceChart = new Chart(context, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Observed cumulative proportion",
                    data: [],
                    borderColor: "#1f3c88",
                    backgroundColor: "rgba(31, 60, 136, 0.12)",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: "Theoretical probability p",
                    data: [],
                    borderColor: "#d33",
                    borderWidth: 2,
                    borderDash: [8, 6],
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Number of trials"
                    }
                },
                y: {
                    min: 0,
                    max: 1,
                    title: {
                        display: true,
                        text: "Cumulative proportion"
                    }
                }
            }
        }
    });
}

function updateStatistics(completed, successes, probability) {
    const failures = completed - successes;
    const observed = completed === 0 ? 0 : successes / completed;
    const error = Math.abs(observed - probability);

    completedValue.textContent = completed;
    successValue.textContent = successes;
    failureValue.textContent = failures;
    observedValue.textContent = observed.toFixed(4);
    theoreticalValue.textContent = probability.toFixed(4);
    errorValue.textContent = error.toFixed(4);

    return { failures, observed, error };
}

function setControlsRunning(isRunning) {
    probabilityInput.disabled = isRunning;
    trialsInput.disabled = isRunning;
    speedSelect.disabled = isRunning;
    startButton.disabled = isRunning;
}

async function runSimulation() {
    let parameters;

    try {
        parameters = readParameters();
    } catch (error) {
        finalResult.textContent = error.message;
        return;
    }

    const { probability, trials, delay } = parameters;
    const currentSimulationId = ++simulationId;
    let successes = 0;

    setControlsRunning(true);
    createChart(probability);
    updateStatistics(0, 0, probability);
    finalResult.textContent = "Simulation in progress...";

    const updateEvery = delay === 0
        ? Math.max(1, Math.floor(trials / 250))
        : 1;

    for (let trial = 1; trial <= trials; trial++) {
        if (currentSimulationId !== simulationId) {
            return;
        }

        if (Math.random() < probability) {
            successes++;
        }

        const observed = successes / trial;
        const shouldUpdate = trial % updateEvery === 0 || trial === trials;

        if (shouldUpdate) {
            convergenceChart.data.labels.push(trial);
            convergenceChart.data.datasets[0].data.push(observed);
            convergenceChart.data.datasets[1].data.push(probability);
            convergenceChart.update("none");
            updateStatistics(trial, successes, probability);
        }

        if (delay > 0) {
            await sleep(delay);
        }
    }

    if (currentSimulationId !== simulationId) {
        return;
    }

    const result = updateStatistics(trials, successes, probability);
    finalResult.textContent =
        `Final sample proportion: ${result.observed.toFixed(4)} | ` +
        `Absolute error: ${result.error.toFixed(4)}`;

    setControlsRunning(false);
}

function resetSimulation() {
    simulationId++;
    setControlsRunning(false);

    if (convergenceChart) {
        convergenceChart.destroy();
        convergenceChart = null;
    }

    const probability = Number(probabilityInput.value);
    const validProbability = Number.isFinite(probability) &&
        probability >= 0 && probability <= 1
        ? probability
        : 0.5;

    updateStatistics(0, 0, validProbability);
    finalResult.textContent = "Run the simulation to see the results.";
}

startButton.addEventListener("click", runSimulation);
resetButton.addEventListener("click", resetSimulation);

resetSimulation();
