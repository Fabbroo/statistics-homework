const p = 17;

const G = {
    x: 1,
    y: 5
};

const canvas = document.getElementById("curveCanvas");
const ctx = canvas.getContext("2d");

const size = 35;
const offset = 40;

let chartX = null;
let chartY = null;

function mod(n, p) {
    return ((n % p) + p) % p;
}

function modInverse(a, p) {

    a = mod(a, p);

    for (let x = 1; x < p; x++) {

        if ((a * x) % p === 1) {
            return x;
        }
    }

    return null;
}

function pointAdd(P, Q) {

    if (P.infinity) return Q;
    if (Q.infinity) return P;

    if (
        P.x === Q.x &&
        mod(P.y + Q.y, p) === 0
    ) {
        return { infinity: true };
    }

    let m;

    if (
        P.x === Q.x &&
        P.y === Q.y
    ) {

        const inv =
            modInverse(
                2 * P.y,
                p
            );

        m = mod(
            (3 * P.x * P.x) * inv,
            p
        );

    } else {

        const inv =
            modInverse(
                Q.x - P.x,
                p
            );

        m = mod(
            (Q.y - P.y) * inv,
            p
        );
    }

    const x3 = mod(
        m * m - P.x - Q.x,
        p
    );

    const y3 = mod(
        m * (P.x - x3) - P.y,
        p
    );

    return {
        x: x3,
        y: y3
    };
}

function scalarMultiply(k, G) {

    let current = {
        infinity: true
    };

    for (let i = 0; i < k; i++) {
        current =
            pointAdd(current, G);
    }

    return current;
}

function getCurvePoints() {

    const points = [];

    for (let x = 0; x < p; x++) {

        for (let y = 0; y < p; y++) {

            if (
                mod(y * y, p) ===
                mod(x * x * x + 7, p)
            ) {
                points.push({
                    x,
                    y
                });
            }
        }
    }

    return points;
}

function drawGrid() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "#fff";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.strokeStyle = "#ddd";

    for (let i = 0; i <= 17; i++) {

        let pos =
            offset + i * size;

        ctx.beginPath();
        ctx.moveTo(offset, pos);
        ctx.lineTo(offset + 17 * size, pos);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pos, offset);
        ctx.lineTo(pos, offset + 17 * size);
        ctx.stroke();
    }

    ctx.fillStyle = "black";

    for (let i = 0; i < 17; i++) {

        ctx.fillText(
            i,
            offset - 20,
            offset + (16 - i) * size
        );

        ctx.fillText(
            i,
            offset + i * size,
            offset + 17 * size + 15
        );
    }
}

function drawPoint(
    point,
    color,
    radius = 8
) {

    if (point.infinity) return;

    const px =
        offset +
        point.x * size;

    const py =
        offset +
        (16 - point.y) * size;

    ctx.fillStyle = color;

    ctx.beginPath();

    ctx.arc(
        px,
        py,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "black";

    ctx.fillText(
        `(${point.x},${point.y})`,
        px + 8,
        py - 8
    );
}

function drawCurve() {

    getCurvePoints().forEach(
        point => {

            drawPoint(
                point,
                "#b0b0b0",
                6
            );

        }
    );
}

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

async function runAnimation() {

    const log =
        document.getElementById(
            "log"
        );

    log.innerHTML = "";

    const k =
        parseInt(
            document.getElementById(
                "privateKey"
            ).value
        );

    const delay =
        parseInt(
            document.getElementById(
                "speed"
            ).value
        );

    drawGrid();
    drawCurve();

    drawPoint(
        G,
        "green",
        10
    );

    let current =
        { infinity: true };

    for (let i = 1; i <= k; i++) {

        current =
            pointAdd(
                current,
                G
            );

        const entry =
            document.createElement(
                "div"
            );

        entry.className =
            "log-entry";

        if (current.infinity) {

            entry.innerHTML =
                `<strong>${i}G</strong> = ∞`;

        } else {

            drawPoint(
                current,
                "red",
                10
            );

            entry.innerHTML =
                `<strong>${i}G</strong> = (${current.x}, ${current.y})`;
        }

        log.appendChild(entry);

        log.scrollTop =
            log.scrollHeight;

        await sleep(delay);
    }

    if (current.infinity) {

        document.getElementById(
            "finalResult"
        ).innerHTML =
            `Toy Public Key Q = ${k}G = ∞`;

    } else {

        document.getElementById(
            "finalResult"
        ).innerHTML =
            `Toy Public Key Q = ${k}G = (${current.x}, ${current.y})`;
    }
}

function drawHistogram(
    canvasId,
    title,
    data
) {

    const ctxChart =
        document
            .getElementById(
                canvasId
            )
            .getContext("2d");

    if (
        canvasId === "xChart" &&
        chartX
    ) {
        chartX.destroy();
    }

    if (
        canvasId === "yChart" &&
        chartY
    ) {
        chartY.destroy();
    }

    const chart =
        new Chart(ctxChart, {

            type: "bar",

            data: {

                labels:
                    Object.keys(data),

                datasets: [{
                    label: title,
                    data:
                        Object.values(data),
                    backgroundColor:
                        "#1f3c88"
                }]
            }
        });

    if (canvasId === "xChart") {
        chartX = chart;
    } else {
        chartY = chart;
    }
}

function renderBitStats(
    zeros,
    ones
) {

    document.getElementById(
        "bitStats"
    ).innerHTML =

    `
    <h3>Bit Distribution</h3>

    <p><strong>0 bits:</strong> ${zeros}</p>

    <p><strong>1 bits:</strong> ${ones}</p>
    `;
}

function renderAvalanche(
    rows
) {

    let html = `

    <h3>
        Avalanche-Like Behaviour
    </h3>

    <table>

    <tr>
        <th>k</th>
        <th>Q(k)</th>
        <th>k+1</th>
        <th>Q(k+1)</th>
    </tr>
    `;

    rows.forEach(row => {

        html += `
        <tr>
            <td>${row.k1}</td>
            <td>${row.q1}</td>
            <td>${row.k2}</td>
            <td>${row.q2}</td>
        </tr>
        `;
    });

    html += "</table>";

    document.getElementById(
        "avalancheTable"
    ).innerHTML = html;
}

function renderDiscussion() {

    document.getElementById(
        "discussionBox"
    ).innerHTML =

    `
    <h3>Discussion</h3>

    <p>
    The generated public keys appear distributed
    across the subgroup generated by G.
    </p>

    <p>
    Small changes in the private key often
    produce noticeably different public keys.
    </p>

    <p>
    This resembles some avalanche-like behaviour,
    but ECC scalar multiplication is not a hash
    function. Its security relies on the
    Elliptic Curve Discrete Logarithm Problem.
    </p>

    <p>
    The observed periodicity is due to the finite
    order of the base point. In this toy example
    9G = ∞, therefore the sequence repeats every
    9 multiplications.
    </p>
    `;
}

function runStatisticalAnalysis() {

    const xFreq = {};
    const yFreq = {};

    let bit0 = 0;
    let bit1 = 0;

    const avalancheRows = [];

    let previous = null;

    for (let k = 1; k <= 100; k++) {

        const Q =
            scalarMultiply(
                k,
                G
            );

        if (Q.infinity) {
            continue;
        }

        xFreq[Q.x] =
            (xFreq[Q.x] || 0) + 1;

        yFreq[Q.y] =
            (yFreq[Q.y] || 0) + 1;

        const binary =
            Q.x.toString(2) +
            Q.y.toString(2);

        for (const bit of binary) {

            if (bit === "0") {
                bit0++;
            } else {
                bit1++;
            }
        }

        if (previous) {

            avalancheRows.push({
                k1: k - 1,
                q1:
                    `(${previous.x},${previous.y})`,
                k2: k,
                q2:
                    `(${Q.x},${Q.y})`
            });
        }

        previous = Q;
    }

    drawHistogram(
        "xChart",
        "X Coordinate Frequency",
        xFreq
    );

    drawHistogram(
        "yChart",
        "Y Coordinate Frequency",
        yFreq
    );

    renderBitStats(
        bit0,
        bit1
    );

    renderAvalanche(
        avalancheRows.slice(
            0,
            12
        )
    );

    renderDiscussion();
}

drawGrid();
drawCurve();

document
    .getElementById("startBtn")
    .addEventListener(
        "click",
        runAnimation
    );

document
    .getElementById("analyzeBtn")
    .addEventListener(
        "click",
        runStatisticalAnalysis
    );
