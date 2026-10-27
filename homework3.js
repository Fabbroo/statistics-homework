const N_VALUES = [50, 500, 5000];

let trajectoryChart = null;
let snChart = null;
let avgChart = null;
let normChart = null;

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

function generateIncrement(model, p) {

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
        const path = [];

        for (let step = 0; step < n; step++) {

            score += generateIncrement(
                model,
                p
            );

            path.push(score);
        }

        totals.push(score);
        averages.push(score / n);
        normalized.push(
            score / Math.sqrt(n)
        );

        if (attacker < 10) {
            trajectories.push(path);
        }
    }

    return {
        totals,
        averages,
        normalized,
        trajectories
    };
}

function histogram(data, bins = 25) {

    const min = Math.min(...data);
    const max = Math.max(...data);

    const width = (max - min) / bins || 1;

    const counts = Array(bins).fill(0);
    const labels = [];

    for (let i = 0; i < bins; i++) {

        labels.push(
            (min + i * width).toFixed(2)
        );
    }

    data.forEach(value => {

        let index = Math.floor(
            (value - min) / width
        );

        if (index >= bins) {
            index = bins - 1;
        }

        counts[index]++;
    });

    return { labels, counts };
}

function createHistogramChart(
    canvasId,
    datasets,
    title
) {

    const canvas =
        document.getElementById(canvasId);

    let previous =
        Chart.getChart(canvas);

    if (previous) {
        previous.destroy();
    }

    new Chart(canvas, {

        type: "bar",

        data: {
            labels: datasets[0].labels,
            datasets: datasets.map(d => ({
                label: d.label,
                data: d.counts
            }))
        },

        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}

function drawTrajectories(paths) {

    const canvas =
        document.getElementById(
            "trajectoryChart"
        );

    if (trajectoryChart) {
        trajectoryChart.destroy();
    }

    trajectoryChart =
        new Chart(canvas, {

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
                        (path, index) => ({
                            label:
                                `Attacker ${index + 1}`,
                            data: path,
                            pointRadius: 0
                        })
                    )
            },

            options: {
                responsive: true
            }
        });
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

    const allResults = [];

    for (const n of N_VALUES) {

        allResults.push({
            n,
            ...simulateForN(
                n,
                m,
                model,
                p
            )
        });
    }

    const largest =
        allResults[
            allResults.length - 1
        ];

    drawTrajectories(
        largest.trajectories
    );

    createHistogramChart(
        "snChart",
        allResults.map(r => ({
            label: `n=${r.n}`,
            ...histogram(r.totals)
        })),
        "Total Score Sₙ"
    );

    createHistogramChart(
        "avgChart",
        allResults.map(r => ({
            label: `n=${r.n}`,
            ...histogram(r.averages)
        })),
        "Average Score Sₙ/n"
    );

    createHistogramChart(
        "normChart",
        allResults.map(r => ({
            label: `n=${r.n}`,
            ...histogram(r.normalized)
        })),
        "Normalized Score Sₙ/√n"
    );

    updateStatistics(allResults);
    updateDiscussion(model);
}

function updateStatistics(results) {

    let html =
        "<h2>Statistics</h2>";

    results.forEach(r => {

        html += `
            <h3>n = ${r.n}</h3>

            <p>
                Mean(Sn):
                ${mean(r.totals).toFixed(4)}
            </p>

            <p>
                Var(Sn):
                ${variance(r.totals)
                    .toFixed(4)}
            </p>

            <p>
                Mean(Sn/n):
                ${mean(r.averages)
                    .toFixed(4)}
            </p>

            <p>
                Var(Sn/n):
                ${variance(r.averages)
                    .toFixed(6)}
            </p>

            <p>
                Mean(Sn/√n):
                ${mean(r.normalized)
                    .toFixed(4)}
            </p>

            <p>
                Var(Sn/√n):
                ${variance(r.normalized)
                    .toFixed(4)}
            </p>

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
    As n increases, the distribution
    of Sₙ becomes wider because its
    variance grows proportionally to n.
    Therefore larger systems exhibit
    larger aggregate score fluctuations.
    </p>

    <p>
    The quantity Sₙ/n becomes
    increasingly concentrated around
    the theoretical expected value.
    This behavior illustrates the
    Law of Large Numbers.
    </p>

    <p>
    The quantity Sₙ/√n keeps
    approximately constant variance.
    It is therefore the appropriate
    normalization for studying the
    asymptotic distribution.
    </p>
    `;

    if (model === "rademacher") {

        text += `
        <p>
        In the Rademacher model the
        normalized score approaches
        a standard normal distribution
        as n increases. The histogram
        becomes increasingly bell-shaped,
        providing empirical evidence
        of the Central Limit Theorem.
        </p>
        `;
    } else {

        text += `
        <p>
        In the Bernoulli model the
        average score converges toward
        p, while the normalized score
        becomes increasingly regular
        and approximately Gaussian.
        </p>
        `;
    }

    document
        .getElementById(
            "discussionBox"
        )
        .innerHTML = text;
}

document
    .getElementById("runBtn")
    .addEventListener(
        "click",
        simulate
    );

simulate();
