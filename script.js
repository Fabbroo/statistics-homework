const p = 17;

const G = {
    x: 1,
    y: 5
};

const canvas = document.getElementById("curveCanvas");
const ctx = canvas.getContext("2d");

const size = 35;
const offset = 40;

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

    if (P.x === Q.x &&
        mod(P.y + Q.y, p) === 0) {
        return { infinity: true };
    }

    let m;

    if (P.x === Q.x && P.y === Q.y) {

        const inv = modInverse(2 * P.y, p);

        m = mod(
            (3 * P.x * P.x) * inv,
            p
        );

    } else {

        const inv = modInverse(Q.x - P.x, p);

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

function getCurvePoints() {

    const points = [];

    for (let x = 0; x < p; x++) {

        for (let y = 0; y < p; y++) {

            if (
                mod(y * y, p) ===
                mod(x * x * x + 7, p)
            ) {
                points.push({ x, y });
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

    ctx.fillStyle = "#ffffff";
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

    ctx.fillStyle = "#000";

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

function drawCurve() {

    const points = getCurvePoints();

    points.forEach(point => {

        drawPoint(
            point,
            "#b0b0b0",
            6
        );
    });
}

function drawPoint(
    point,
    color,
    radius = 8
) {

    const px =
        offset + point.x * size;

    const py =
        offset + (16 - point.y) * size;

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

    ctx.font = "12px Arial";

    ctx.fillText(
        `(${point.x},${point.y})`,
        px + 8,
        py - 8
    );
}

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

async function runAnimation() {

    const log =
        document.getElementById("log");

    log.innerHTML = "";

    const k =
        parseInt(
            document.getElementById("privateKey")
                .value
        );

    const delay =
        parseInt(
            document.getElementById("speed")
                .value
        );

    drawGrid();
    drawCurve();

    let current = G;

    drawPoint(
        G,
        "green",
        10
    );

    for (let i = 1; i <= k; i++) {

        if (i > 1) {
            current =
                pointAdd(current, G);
        }

        drawPoint(
            current,
            "red",
            10
        );

        const entry =
            document.createElement("div");

        entry.className =
            "log-entry";

        entry.innerHTML =
            `<strong>${i}G</strong> = (${current.x}, ${current.y})`;

        log.appendChild(entry);

        log.scrollTop =
            log.scrollHeight;

        await sleep(delay);
    }

    document.getElementById(
        "finalResult"
    ).innerHTML =
        `Toy Public Key Q = ${k}G = (${current.x}, ${current.y})`;
}

drawGrid();
drawCurve();

document
    .getElementById("startBtn")
    .addEventListener(
        "click",
        runAnimation
    );
