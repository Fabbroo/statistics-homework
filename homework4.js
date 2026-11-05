"use strict";

const N_VALUES = [20, 100, 1000];
const THEORETICAL_MEAN = 5;
const THEORETICAL_VARIANCE = 10;
const HISTOGRAM_BINS = 28;

// Vertical reference line used to mark μ or σ².
const referenceLinePlugin = {
    id: "referenceLine",
    afterDatasetsDraw(chart, args, options) {
        if (!options || !Number.isFinite(options.value)) return;

        const xPixel = chart.scales.x.getPixelForValue(options.value);
        const { top, bottom } = chart.chartArea;
        const ctx = chart.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xPixel, top);
        ctx.lineTo(xPixel, bottom);
        ctx.lineWidth = 2;
        ctx.strokeStyle = options.color || "#d62728";
        ctx.stroke();
        ctx.fillStyle = options.color || "#d62728";
        ctx.font = "12px Arial";
        ctx.fillText(options.label || "Theory", xPixel + 5, top + 14);
        ctx.restore();
    }
};

Chart.register(referenceLinePlugin);

function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function empiricalVariance(values) {
    if (values.length < 2) return 0;
    const center = average(values);
    return values.reduce((sum, value) => sum + (value - center) ** 2, 0)
        / (values.length - 1);
}

function sampleScore() {
    // Math.random() is uniform on [0,1), so this is uniform on {0,...,10}.
    return Math.floor(Math.random() * 11);
}

function welfordSample(sampleSize) {
    let count = 0;
    let mean = 0;
    let M2 = 0;

    for (let i = 0; i < sampleSize; i++) {
        const x = sampleScore();
        count++;

        // Welford's three-line core update.
        const delta = x - mean;
        mean += delta / count;
        M2 += delta * (x - mean);
    }

    return {
        mean,
        variance: count > 1 ? M2 / (count - 1) : 0
    };
}

function simulateForN(n, hackers) {
    const means = [];
    const variances = [];

    for (let hacker = 0; hacker < hackers; hacker++) {
        const statistics = welfordSample(n);
        means.push(statistics.mean);
        variances.push(statistics.variance);
    }

    return { n, means, variances };
}

function paddedRange(values, theoreticalValue, minimumAllowed = -Infinity) {
    const rawMin = Math.min(...values, theoreticalValue);
    const rawMax = Math.max(...values, theoreticalValue);
    const span = rawMax - rawMin || 1;
    return {
        min: Math.max(minimumAllowed, rawMin - 0.08 * span),
        max: rawMax + 0.08 * span
    };
}

function buildDensityHistogram(values, bins, min, max) {
    const width = (max - min) / bins;
    const counts = Array(bins).fill(0);

    for (const value of values) {
        let index = Math.floor((value - min) / width);
        if (index < 0) index = 0;
        if (index >= bins) index = bins - 1;
        counts[index]++;
    }

    return counts.map((count, index) => ({
        x: min + (index + 0.5) * width,
        y: count / (values.length * width)
    }));
}

function maximumDensity(series, range) {
    return Math.max(...series.map(values =>
        Math.max(...buildDensityHistogram(
            values,
            HISTOGRAM_BINS,
            range.min,
            range.max
        ).map(point => point.y))
    ));
}

function drawDensityHistogram(canvasId, values, range, yMax, color, referenceValue, referenceLabel) {
    const oldChart = Chart.getChart(canvasId);
    if (oldChart) oldChart.destroy();

    const histogram = buildDensityHistogram(
        values,
        HISTOGRAM_BINS,
        range.min,
        range.max
    );
    const binWidth = (range.max - range.min) / HISTOGRAM_BINS;

    new Chart(document.getElementById(canvasId), {
        type: "bar",
        data: {
            datasets: [{
                label: "Empirical density",
                data: histogram,
                parsing: false,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                barPercentage: 1,
                categoryPercentage: 1,
                barThickness: "flex"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                referenceLine: {
                    value: referenceValue,
                    label: referenceLabel,
                    color: "#d62728"
                },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const center = items[0].parsed.x;
                            return `Bin center: ${center.toFixed(3)}`;
                        },
                        label(item) {
                            return `Density: ${item.parsed.y.toFixed(4)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min: range.min,
                    max: range.max,
                    offset: false,
                    title: { display: true, text: "Estimate" },
                    ticks: { maxTicksLimit: 7 }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: yMax * 1.08,
                    title: { display: true, text: "Density" }
                }
            }
        }
    });
}

function renderResults(results, hackers) {
    const rows = results.map(result => {
        const meanOfMeans = average(result.means);
        const meanOfVariances = average(result.variances);
        const varianceOfMeans = empiricalVariance(result.means);
        const sdOfMeans = Math.sqrt(varianceOfMeans);
        const sdOfVariances = Math.sqrt(empiricalVariance(result.variances));
        const theoreticalSE = Math.sqrt(THEORETICAL_VARIANCE / result.n);

        return `
            <tr>
                <td>${result.n}</td>
                <td>${meanOfMeans.toFixed(5)}</td>
                <td>${Math.abs(meanOfMeans - THEORETICAL_MEAN).toFixed(5)}</td>
                <td>${meanOfVariances.toFixed(5)}</td>
                <td>${Math.abs(meanOfVariances - THEORETICAL_VARIANCE).toFixed(5)}</td>
                <td>${sdOfMeans.toFixed(5)}</td>
                <td>${theoreticalSE.toFixed(5)}</td>
                <td>${sdOfVariances.toFixed(5)}</td>
            </tr>`;
    }).join("");

    document.getElementById("resultsBox").innerHTML = `
        <h2>Numerical comparison with theory</h2>
        <p>Results from ${hackers.toLocaleString()} independent hackers for each value of n.</p>
        <div style="overflow-x:auto">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>n</th>
                        <th>Average X̄</th>
                        <th>|Average X̄ - μ|</th>
                        <th>Average s²</th>
                        <th>|Average s² - σ²|</th>
                        <th>Empirical SD(X̄)</th>
                        <th>Theoretical σ/√n</th>
                        <th>Empirical SD(s²)</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="good">
            The relevant comparison is not that every hacker obtains exactly 5 and 10.
            Rather, the averages across repeated samples should be near 5 and 10, while
            the variability of the estimators should shrink as n grows.
        </p>`;
}

function runExperiment() {
    const input = document.getElementById("hackers");
    const hackers = Number.parseInt(input.value, 10);
    const status = document.getElementById("status");

    if (!Number.isInteger(hackers) || hackers < 10 || hackers > 20000) {
        status.textContent = "Please choose an integer m between 10 and 20,000.";
        return;
    }

    status.textContent = "Running simulation...";

    // Let the browser paint the status message before the CPU-intensive loop.
    window.setTimeout(() => {
        const results = N_VALUES.map(n => simulateForN(n, hackers));
        const colors = ["#4e79a7", "#f28e2b", "#59a14f"];

        const allMeans = results.flatMap(result => result.means);
        const allVariances = results.flatMap(result => result.variances);
        const meanRange = paddedRange(allMeans, THEORETICAL_MEAN, 0);
        const varianceRange = paddedRange(allVariances, THEORETICAL_VARIANCE, 0);
        const meanYMax = maximumDensity(results.map(result => result.means), meanRange);
        const varianceYMax = maximumDensity(results.map(result => result.variances), varianceRange);

        results.forEach((result, index) => {
            drawDensityHistogram(
                `mean${result.n}`,
                result.means,
                meanRange,
                meanYMax,
                colors[index],
                THEORETICAL_MEAN,
                "μ = 5"
            );

            drawDensityHistogram(
                `variance${result.n}`,
                result.variances,
                varianceRange,
                varianceYMax,
                colors[index],
                THEORETICAL_VARIANCE,
                "σ² = 10"
            );
        });

        renderResults(results, hackers);
        status.textContent = "Simulation completed.";
    }, 20);
}

document.getElementById("runBtn").addEventListener("click", runExperiment);
runExperiment();
