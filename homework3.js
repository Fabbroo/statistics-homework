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
        const path = [];

        for (let step = 0; step < n; step++) {

            score += increment(model, p);

            path.push(score);
        }

        totals.push(score);
        averages.push(score / n);
        normalized.push(score / Math.sqrt(n));

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

function buildHistogram(data, bins = 25) {

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

    return {
        labels,
        counts
    };
}

function drawHistogram(canvasId, values, color) {

    const canvas =
        document.getElementById(canvasId);

    const oldChart =
        Chart.getChart(canvas);

    if (oldChart) {
        oldChart.destroy();
    }

    const histogram =
        buildHistogram(values);

    new Chart(canvas, {

        type: "bar",

        data: {

            labels: histogram.labels,

            datasets: [{
                data: histogram.counts,
                backgroundColor: color
            }]
        },

        options: {

            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 8
                    }
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
                            pointRadius: 0,
                            borderWidth: 1
                        })
                    )
            },

            options: {
                responsive: true
            }
        });
}

function updateStatistics(results) {

    let html = `
        <h2>Empirical Statistics</h2>
    `;

    results.forEach(r => {

        html += `

            <h3>n = ${r.n}</h3>

            <p>
                <strong>Mean(Sₙ)</strong>:
                ${mean(r.totals).toFixed(4)}
            </p>

            <p>
                <strong>Var(Sₙ)</strong>:
                ${variance(r.totals).toFixed(4)}
            </p>

            <p>
                <strong>Mean(Sₙ/n)</strong>:
                ${mean(r.averages).toFixed(4)}
            </p>

            <p>
                <strong>Var(Sₙ/n)</strong>:
                ${variance(r.averages).toFixed(6)}
            </p>

            <p>
                <strong>Mean(Sₙ/√n)</strong>:
                ${mean(r.normalized).toFixed(4)}
            </p>

            <p>
                <strong>Var(Sₙ/√n)</strong>:
                ${variance(r.normalized).toFixed(4)}
            </p>

            <hr>
        `;
    });

    document.getElementById(
        "statsBox"
    ).innerHTML = html;
}

function updateDiscussion(model, p) {

    let discussion = `

    <h2>Discussion</h2>

    <h3>Total Score Sₙ</h3>

    <p>
    As n increases, the spread of the distribution
    of Sₙ increases. This is expected because
    Var(Sₙ)=nVar(X), so the variance grows linearly
    with the number of systems considered.
    Larger infrastructures therefore exhibit larger
    aggregate penetration score fluctuations.
    </p>

    <h3>Average Score Sₙ/n</h3>

    <p>
    The empirical distributions become progressively
    concentrated around their theoretical mean.
    This behavior illustrates the Law of Large Numbers.
    Random fluctuations become less important when
    many systems are observed.
    </p>

    <h3>Normalized Score Sₙ/√n</h3>

    <p>
    The normalization by √n keeps the variance
    approximately constant as n grows. This allows
    meaningful comparisons across different system sizes.
    </p>
    `;

    if (model === "bernoulli") {

        discussion += `

        <p>
        For the Bernoulli model the theoretical mean
        is p = ${p}. As n increases, the average score
        clearly approaches this value, confirming the
        Law of Large Numbers.
        </p>
        `;
    }

    if (model === "rademacher") {

        discussion += `

        <p>
        The Rademacher model has mean 0 and variance 1.
        As n increases, the histogram of Sₙ/√n becomes
        increasingly bell-shaped and approaches a standard
        normal distribution, providing empirical evidence
        of the Central Limit Theorem.
        </p>
        `;
    }

    document.getElementById(
        "discussionBox"
    ).innerHTML = discussion;
}

function simulate() {

    const model =
        document.getElementById("model").value;

    const m =
        parseInt(
            document.getElementById("m").value
        );

    const p =
        parseFloat(
            document.getElementById("p").value
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

    drawHistogram(
        "snChart50",
        results[0].totals,
        "#4e79a7"
    );

    drawHistogram(
        "snChart500",
        results[1].totals,
        "#f28e2b"
    );

    drawHistogram(
        "snChart5000",
        results[2].totals,
        "#59a14f"
    );

    drawHistogram(
        "avgChart50",
        results[0].averages,
        "#4e79a7"
    );

    drawHistogram(
        "avgChart500",
        results[1].averages,
        "#f28e2b"
    );

    drawHistogram(
        "avgChart5000",
        results[2].averages,
        "#59a14f"
    );

    drawHistogram(
        "normChart50",
        results[0].normalized,
        "#4e79a7"
    );

    drawHistogram(
        "normChart500",
        results[1].normalized,
        "#f28e2b"
    );

    drawHistogram(
        "normChart5000",
        results[2].normalized,
        "#59a14f"
    );

    updateStatistics(results);
    updateDiscussion(model, p);
}

document
    .getElementById("runBtn")
    .addEventListener(
        "click",
        simulate
    );

simulate();
