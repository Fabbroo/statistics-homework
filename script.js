const p = 17;

const G = {
    x: 1,
    y: 5
};

const k = 6;

function mod(n, p) {
    return ((n % p) + p) % p;
}

function modInverse(a, p) {
    a = mod(a, p);

    for (let x = 1; x < p; x++) {
        if (mod(a * x, p) === 1) {
            return x;
        }
    }

    throw new Error("Inverse does not exist");
}

function pointAdd(P, Q) {

    let m;

    if (P.x === Q.x && P.y === Q.y) {

        const numerator = mod(3 * P.x * P.x, p);
        const denominator = modInverse(2 * P.y, p);

        m = mod(numerator * denominator, p);

    } else {

        const numerator = mod(Q.y - P.y, p);
        const denominator = modInverse(Q.x - P.x, p);

        m = mod(numerator * denominator, p);
    }

    const x3 = mod(m * m - P.x - Q.x, p);

    const y3 = mod(
        m * (P.x - x3) - P.y,
        p
    );

    return {
        x: x3,
        y: y3
    };
}

function scalarMultiplication(k, G) {

    let current = G;

    const points = [G];

    for (let i = 2; i <= k; i++) {
        current = pointAdd(current, G);
        points.push(current);
    }

    return points;
}

const points = scalarMultiplication(k, G);

const stepsDiv = document.getElementById("steps");

points.forEach((point, index) => {

    const div = document.createElement("div");

    div.className = "step";

    div.textContent =
        `${index + 1}G = (${point.x}, ${point.y})`;

    stepsDiv.appendChild(div);
});

const publicKey = points[points.length - 1];

document.getElementById("result").innerHTML =
    `Q = ${k}G = (${publicKey.x}, ${publicKey.y})`;
