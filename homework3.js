const N_VALUES = [50, 500, 5000];

let trajectoryChart = null;

function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
    const m = mean(arr);

    return arr.reduce(
        (sum, x) => sum + (x - m) ** 2,
        0
    ) / arr.length;
}

function gaussian(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function increment(model, p) {
    if (model === "bernoulli") {
        return Math.random() < p ? 1 : 0;
    }

    return Math.random() < 0.5 ? -1 : 1;
}

function simulateForN(n, m, model, p) {

    const totals = [];
    const averages = [];
    const normalized = [];
    const trajectories = [];

    for (let attacker = 0; attacker < m; attacker++) {

        let score = 0;
        const trajectory = [];

        for (let step = 0; step < n; step++) {

            score += increment(model, p);

            trajectory.push(score);
        }

        totals.push(score);
        averages.push(score / n);
        normalized.push(score / Math.sqrt(n));

        if (attacker < 10) {
            trajectories.push(trajectory);
        }
    }

    return {
        totals,
        averages,
        normalized,
        trajectories
    };
}

function buildDensityHistogram(
    data,
    bins,
    globalMin,
    globalMax
) {

    const width =
        (globalMax - globalMin) / bins;

    const counts =
        Array(bins).fill(0);

    data.forEach(value => {

        let idx = Math.floor(
            (value - globalMin) / width
        );

        if (idx < 0) {
            idx = 0;
        }

        if (idx >= bins) {
            idx = bins - 1;
        }

        counts[idx]++;
    });

    const density =
        counts.map(
            c => c / (data.length * width)
        );

    const labels = [];

    for (let i = 0; i < bins; i++) {

        labels.push(
            (
                globalMin +
                (i + 0.5) * width
            ).toFixed(2)
        );
    }

    return {
        labels,
        density
    };
}

function destroyChart(canvasId) {

    const existing =
        Chart.getChart(canvasId);

    if (existing) {
        existing.destroy();
    }
}

function drawHistogram(
    canvasId,
    values,
    globalMin,
    globalMax,
    color,
    normalOverlay = false
) {

    destroyChart(canvasId);

    const bins = 30;

    const hist =
        buildDensityHistogram(
            values,
            bins,
            globalMin,
            globalMax
        );

    const datasets = [

        {
            type: "bar",
            label: "Empirical Density",
            data: hist.density,
            backgroundColor: color
        }
    ];

    if (normalOverlay) {

        const width =
            (globalMax - globalMin) / bins;

        const gaussianPoints =
            hist.labels.map(center => {

                return gaussian(
                    parseFloat(center)
                );
            });

        datasets.push({
            type: "line",
            label: "N(0,1)",
            data: gaussianPoints,
            borderColor: "#d62728",
            borderWidth: 2,
            fill: false,
            pointRadius: 0
        });
    }

    new Chart(
        document.getElementById(canvasId),
        {
            data: {
                labels: hist.labels,
                datasets
            },
            options: {
                responsive: true,

                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "Density"
                        }
                    }
                }
            }
        }
    );
}

function drawTrajectories(paths) {

    if (trajectoryChart) {
        trajectoryChart.destroy();
    }

    trajectoryChart =
        new Chart(
            document.getElementById(
                "trajectoryChart"
            ),
            {
                type: "line",

                data: {

                    labels:
                    Array.from(
                        {
                            length:
                            paths[0].length
                        },
                        (_, i) => i + 1
                    ),

                    datasets:
                    paths.map(
                        (path, idx) => ({
                            label:
                            `Attacker ${idx + 1}`,
                            data: path,
                            pointRadius: 0,
                            borderWidth: 1
                        })
                    )
                }
            }
        );
}

function globalRange(results, key) {

    const data =
        results.flatMap(
            r => r[key]
        );

    return {
        min: Math.min(...data),
        max: Math.max(...data)
    };
}

function updateStatistics(results) {

    let html =
        "<h2>Empirical Statistics</h2>";

    results.forEach(r => {

        html += `
        <h3>n = ${r.n}</h3>

        <p><b>Mean(Sₙ)</b>:
        ${mean(r.totals).toFixed(4)}</p>

        <p><b>Var(Sₙ)</b>:
        ${variance(r.totals).toFixed(4)}</p>

        <p><b>Mean(Sₙ/n)</b>:
        ${mean(r.averages).toFixed(4)}</p>

        <p><b>Var(Sₙ/n)</b>:
        ${variance(r.averages).toFixed(6)}</p>

        <p><b>Mean(Sₙ/√n)</b>:
        ${mean(r.normalized).toFixed(4)}</p>

        <p><b>Var(Sₙ/√n)</b>:
        ${variance(r.normalized).toFixed(4)}</p>

        <hr>
        `;
    });

    document
        .getElementById("statsBox")
        .innerHTML = html;
}

function updateDiscussion(model) {

    let text = `
    <h2>Discussion</h2>

    <p>
    For Sₙ, the distributions become increasingly
    spread out as n grows because the variance grows
    proportionally to n.
    </p>

    <p>
    For Sₙ/n, the distributions become narrower
    around the theoretical mean, illustrating the
    Law of Large Numbers.
    </p>

    <p>
    For Sₙ/√n, the variance remains approximately
    constant, making it possible to compare
    different values of n on the same scale.
    </p>
    `;

    if (model === "rademacher") {

        text += `
        <p>
        The red curve corresponds to the theoretical
        standard normal density N(0,1). As n grows,
        the empirical distribution of Sₙ/√n approaches
        this curve, providing visual evidence of the
        Central Limit Theorem.
        </p>
        `;
    }

    document
        .getElementById("discussionBox")
        .innerHTML = text;
}

function simulate() {

    const model =
        document
        .getElementById("model")
        .value;

    const m =
        parseInt(
            document
            .getElementById("m")
            .value
        );

    const p =
        parseFloat(
            document
            .getElementById("p")
            .value
        );

    const results = [];

    for (const n of N_VALUES) {

        results.push({
            n,
            ...simulateForN(
                n,
                m,
                model,
                p
            )
        });
    }

    drawTrajectories(
        results[2].trajectories
    );

    const totalRange =
        globalRange(
            results,
            "totals"
        );

    const avgRange =
        globalRange(
            results,
            "averages"
        );

    const normRange =
        globalRange(
            results,
            "normalized"
        );

    drawHistogram(
        "sn50",
        results[0].totals,
        totalRange.min,
        totalRange.max,
        "#4e79a7"
    );

    drawHistogram(
        "sn500",
        results[1].totals,
        totalRange.min,
        totalRange.max,
        "#f28e2b"
    );

    drawHistogram(
        "sn5000",
        results[2].totals,
        totalRange.min,
        totalRange.max,
        "#59a14f"
    );

    drawHistogram(
        "avg50",
        results[0].averages,
        avgRange.min,
        avgRange.max,
        "#4e79a7"
    );

    drawHistogram(
        "avg500",
        results[1].averages,
        avgRange.min,
        avgRange.max,
        "#f28e2b"
    );

    drawHistogram(
        "avg5000",
        results[2].averages,
        avgRange.min,
        avgRange.max,
        "#59a14f"
    );

    const showCLT =
        model === "rademacher";

    drawHistogram(
        "norm50",
        results[0].normalized,
        normRange.min,
        normRange.max,
        "#4e79a7",
        showCLT
    );

    drawHistogram(
        "norm500",
        results[1].normalized,
        normRange.min,
        normRange.max,
        "#f28e2b",
        showCLT
    );

    drawHistogram(
        "norm5000",
        results[2].normalized,
        normRange.min,
        normRange.max,
        "#59a14f",
        showCLT
    );

    updateStatistics(results);
    updateDiscussion(model);
}

document
.getElementById("runBtn")
.addEventListener(
    "click",
    simulate
);

simulate();
