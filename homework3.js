const p = 17;

const G = {
    x: 1,
    y: 5
};

let freqChart = null;
let languageFreq = {};

let eccCiphertext = [];
let eccPublicKey = null;

/* ======================================
   ECC OPERATIONS
====================================== */

function mod(a, p) {
    return ((a % p) + p) % p;
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

    if (P.x === Q.x && P.y === Q.y) {

        m = mod(
            (3 * P.x * P.x) *
            modInverse(2 * P.y, p),
            p
        );

    } else {

        m = mod(
            (Q.y - P.y) *
            modInverse(Q.x - P.x, p),
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

function scalarMultiply(k, point) {

    let result = {
        infinity: true
    };

    for (let i = 0; i < k; i++) {
        result = pointAdd(result, point);
    }

    return result;
}

/* ======================================
   ECC TOY ENCRYPTION
====================================== */

function eccEncrypt() {

    const key =
        parseInt(
            document.getElementById("eccKey").value
        );

    const message =
        document.getElementById("eccMessage").value;

    eccPublicKey =
        scalarMultiply(key, G);

    const secret =
        eccPublicKey.infinity
        ? 0
        : eccPublicKey.x;

    eccCiphertext =
        [...message].map(
            ch => ch.charCodeAt(0) ^ secret
        );

    document.getElementById("eccOutput").innerHTML =
    `
    <strong>Public key:</strong>
    (${eccPublicKey.x}, ${eccPublicKey.y})

    <br><br>

    <strong>Secret:</strong>
    ${secret}

    <br><br>

    <strong>Ciphertext:</strong>
    <br>
    ${eccCiphertext.join(", ")}
    `;
}

function eccDecrypt() {

    const key =
        parseInt(
            document.getElementById("eccKey").value
        );

    const Q =
        scalarMultiply(key, G);

    const secret =
        Q.infinity ? 0 : Q.x;

    const plaintext =
        eccCiphertext
        .map(
            v =>
            String.fromCharCode(
                v ^ secret
            )
        )
        .join("");

    document.getElementById("eccOutput").innerHTML =
    `
    <strong>Plaintext:</strong>
    <br>
    ${plaintext}
    `;
}

/* ======================================
   CAESAR
====================================== */

function shiftChar(char, shift) {

    if (!/[a-z]/i.test(char))
        return char;

    const base =
        char === char.toUpperCase()
            ? 65
            : 97;

    return String.fromCharCode(
        (
            char.charCodeAt(0)
            - base
            + shift
            + 26
        ) % 26 + base
    );
}

function caesarEncrypt() {

    const shift =
        parseInt(
            document.getElementById("caesarShift").value
        );

    const text =
        document.getElementById("caesarMessage").value;

    const cipher =
        [...text]
        .map(
            c => shiftChar(c, shift)
        )
        .join("");

    document.getElementById("caesarOutput").innerHTML =
        cipher;

    document.getElementById("attackCiphertext").value =
        cipher;
}

function caesarDecrypt() {

    const shift =
        parseInt(
            document.getElementById("caesarShift").value
        );

    const text =
        document.getElementById("caesarMessage").value;

    const plain =
        [...text]
        .map(
            c => shiftChar(c, -shift)
        )
        .join("");

    document.getElementById("caesarOutput").innerHTML =
        plain;
}

/* ======================================
   FREQUENCY ANALYSIS
====================================== */

function analyzeCorpus() {

    const text =
        document.getElementById("corpusText")
        .value
        .toUpperCase();

    languageFreq = {};

    for (let c of text) {

        if (
            c >= "A" &&
            c <= "Z"
        ) {

            languageFreq[c] =
                (languageFreq[c] || 0)
                + 1;
        }
    }

    const labels =
        Object.keys(languageFreq);

    const values =
        Object.values(languageFreq);

    const ctx =
        document
        .getElementById("frequencyChart")
        .getContext("2d");

    if (freqChart)
        freqChart.destroy();

    freqChart =
        new Chart({
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Frequency",
                    data: values
                }]
            }
        }, ctx);
}

function scoreText(text) {

    let score = 0;

    for (let c of text.toUpperCase()) {
        score += languageFreq[c] || 0;
    }

    return score;
}

function recoverCaesar() {

    const cipher =
        document.getElementById("attackCiphertext").value;

    let candidates = [];

    for (let shift = 0; shift < 26; shift++) {

        const plain =
            [...cipher]
            .map(
                c =>
                shiftChar(
                    c,
                    -shift
                )
            )
            .join("");

        const score =
            scoreText(plain);

        candidates.push({
            shift,
            score,
            plain
        });
    }

    candidates.sort(
        (a, b) =>
            b.score - a.score
    );

    let html =
        "<h3>Top 5 Candidate Keys</h3>";

    for (let i = 0; i < 5; i++) {

        html += `
        <p>
        <strong>Shift ${candidates[i].shift}</strong><br>
        Score: ${candidates[i].score}<br>
        ${candidates[i].plain}
        </p>
        <hr>
        `;
    }

    document.getElementById("attackOutput").innerHTML =
        html;
}

/* ======================================
   ECC BRUTE FORCE
====================================== */

function bruteForceECC() {

    if (!eccPublicKey) {
        return;
    }

    for (let k = 1; k <= 30; k++) {

        const candidate =
            scalarMultiply(k, G);

        if (
            !candidate.infinity &&
            candidate.x === eccPublicKey.x &&
            candidate.y === eccPublicKey.y
        ) {

            const secret = candidate.x;

            const plaintext =
                eccCiphertext
                .map(
                    v =>
                    String.fromCharCode(
                        v ^ secret
                    )
                )
                .join("");

            document.getElementById("bruteforceOutput").innerHTML =
            `
            <strong>Recovered private key:</strong>
            ${k}

            <br><br>

            <strong>Recovered public key:</strong>
            (${candidate.x}, ${candidate.y})

            <br><br>

            <strong>Recovered secret:</strong>
            ${secret}

            <br><br>

            <strong>Recovered plaintext:</strong>
            <br>
            ${plaintext}
            `;

            return;
        }
    }

    document.getElementById("bruteforceOutput").innerHTML =
        "Key not found.";
}

/* ======================================
   EVENTS
====================================== */

document.getElementById("eccEncryptBtn")
.addEventListener("click", eccEncrypt);

document.getElementById("eccDecryptBtn")
.addEventListener("click", eccDecrypt);

document.getElementById("caesarEncryptBtn")
.addEventListener("click", caesarEncrypt);

document.getElementById("caesarDecryptBtn")
.addEventListener("click", caesarDecrypt);

document.getElementById("analyzeCorpusBtn")
.addEventListener("click", analyzeCorpus);

document.getElementById("attackBtn")
.addEventListener("click", recoverCaesar);

document.getElementById("bruteforceBtn")
.addEventListener("click", bruteForceECC);
