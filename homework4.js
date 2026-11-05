const N_VALUES = [20, 100, 1000];

const SCORES =
[
    0,1,2,3,4,5,6,7,8,9,10
];

const PROB =
[
    0.05,
    0.05,
    0.08,
    0.10,
    0.12,
    0.20,
    0.15,
    0.10,
    0.08,
    0.05,
    0.02
];

function theoreticalMean()
{
    let mu = 0;

    for(let i=0;i<SCORES.length;i++)
    {
        mu += SCORES[i]*PROB[i];
    }

    return mu;
}

function theoreticalVariance()
{
    const mu = theoreticalMean();

    let secondMoment = 0;

    for(let i=0;i<SCORES.length;i++)
    {
        secondMoment +=
            SCORES[i]*
            SCORES[i]*
            PROB[i];
    }

    return secondMoment-mu*mu;
}

const MU = theoreticalMean();
const VAR = theoreticalVariance();

function sampleScore()
{
    const u = Math.random();

    let cumulative = 0;

    for(let i=0;i<PROB.length;i++)
    {
        cumulative += PROB[i];

        if(u <= cumulative)
        {
            return SCORES[i];
        }
    }

    return 10;
}

function welford(dataGenerator, n)
{
    let mean = 0;
    let ss = 0;
    let count = 0;

    for(let i=0;i<n;i++)
    {
        const x = dataGenerator();

        count++;

        const delta =
            x - mean;

        mean +=
            delta / count;

        ss +=
            delta *
            (x - mean);
    }

    return {
        mean,
        variance:
            ss/(count-1)
    };
}

function histogram(data,bins=25)
{
    const min =
        Math.min(...data);

    const max =
        Math.max(...data);

    const width =
        (max-min)/bins || 1;

    const counts =
        Array(bins).fill(0);

    const labels = [];

    for(let i=0;i<bins;i++)
    {
        labels.push(
            (
                min +
                i*width
            ).toFixed(2)
        );
    }

    data.forEach(v =>
    {
        let idx =
            Math.floor(
                (v-min)/width
            );

        if(idx>=bins)
        {
            idx=bins-1;
        }

        counts[idx]++;
    });

    return {
        labels,
        counts
    };
}

function drawHistogram(
    canvasId,
    values,
    color
)
{
    const canvas =
        document.getElementById(
            canvasId
        );

    const old =
        Chart.getChart(canvas);

    if(old)
    {
        old.destroy();
    }

    const h =
        histogram(values);

    new Chart(canvas,
    {
        type:"bar",

        data:
        {
            labels:h.labels,

            datasets:
            [{
                data:h.counts,
                backgroundColor:color
            }]
        },

        options:
        {
            responsive:true,

            plugins:
            {
                legend:
                {
                    display:false
                }
            }
        }
    });
}

function simulate()
{
    const m =
        parseInt(
            document
            .getElementById(
                "hackers"
            ).value
        );

    const results = [];

    N_VALUES.forEach(n =>
    {
        const means = [];
        const variances = [];

        for(let i=0;i<m;i++)
        {
            const stats =
                welford(
                    sampleScore,
                    n
                );

            means.push(
                stats.mean
            );

            variances.push(
                stats.variance
            );
        }

        results.push({
            n,
            means,
            variances
        });
    });

    drawHistogram(
        "mean20",
        results[0].means,
        "#4e79a7"
    );

    drawHistogram(
        "mean100",
        results[1].means,
        "#f28e2b"
    );

    drawHistogram(
        "mean1000",
        results[2].means,
        "#59a14f"
    );

    drawHistogram(
        "var20",
        results[0].variances,
        "#4e79a7"
    );

    drawHistogram(
        "var100",
        results[1].variances,
        "#f28e2b"
    );

    drawHistogram(
        "var1000",
        results[2].variances,
        "#59a14f"
    );

    let html =
        "<h2>Comparison With Theory</h2>";

    results.forEach(r =>
    {
        const meanAvg =
            r.means.reduce(
                (a,b)=>a+b,
                0
            )/r.means.length;

        const varianceAvg =
            r.variances.reduce(
                (a,b)=>a+b,
                0
            )/r.variances.length;

        html += `
        <h3>n=${r.n}</h3>

        <p>
        Average Sampling Mean:
        ${meanAvg.toFixed(4)}
        </p>

        <p>
        Theoretical Mean:
        ${MU.toFixed(4)}
        </p>

        <p>
        Average Sampling Variance:
        ${varianceAvg.toFixed(4)}
        </p>

        <p>
        Theoretical Variance:
        ${VAR.toFixed(4)}
        </p>

        <hr>
        `;
    });

    document
        .getElementById("resultsBox")
        .innerHTML = html;

    document
        .getElementById("discussionBox")
        .innerHTML =
    `
    <h2>Discussion</h2>

    <p>
    The average of the sampling means
    is very close to the theoretical
    mean μ.
    </p>

    <p>
    The average of the sampling
    variances is very close to
    the theoretical variance σ².
    </p>

    <p>
    As n increases, the distributions
    of the sampling means become
    narrower. This is predicted by

    Var(X̄)=σ²/n.
    </p>

    <p>
    The sampling variances also
    become increasingly concentrated
    around σ².
    </p>

    <p>
    This demonstrates consistency
    of the estimators and explains
    why sample statistics can be used
    to estimate population parameters
    in inferential statistics.
    </p>
    `;
}

document
.getElementById(
    "runBtn"
)
.addEventListener(
    "click",
    simulate
);

document
.getElementById(
    "theoryBox"
)
.innerHTML =
`
<p>
μ = ${MU.toFixed(4)}
</p>

<p>
σ² = ${VAR.toFixed(4)}
</p>

<p>
Welford Recurrence:
</p>

<pre>
delta = x - mean
mean += delta / n
SS += delta * (x - mean)
</pre>
`;

simulate();
