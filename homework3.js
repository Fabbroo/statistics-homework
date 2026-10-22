const p = 17;

const G = {
    x: 1,
    y: 5
};

let freqChart = null;
let languageFreq = {};

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

        m =
            mod(
                3 * P.x * P.x * inv,
                p
            );

    } else {

        const inv =
            modInverse(
                Q.x - P.x,
                p
            );

        m =
            mod(
                (Q.y - P.y) * inv,
                p
            );
    }

    const x3 =
        mod(
            m * m - P.x - Q.x,
            p
        );

    const y3 =
        mod(
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
        current = pointAdd(
            current,
            G
        );
    }

    return current;
}

/* =====================================================
   ECC TOY ENCRYPTION
===================================================== */

let currentCipher = [];

function eccEncrypt() {

    const k =
        parseInt(
            document.getElementById("eccKey").value
        );

    const message =
        document.getElementById("eccMessage").value;

    const publicKey =
        scalarMultiply(k, G);

    const secret =
        publicKey.infinity
            ? 0
            : publicKey.x;

    currentCipher =
        [...message].map(
            ch => ch.charCodeAt(0) ^ secret
        );

    document.getElementById("eccOutput").innerHTML =
        `
        Cipher:
        ${currentCipher.join(", ")}
        `;

    document.getElementById("eccExplanation").innerHTML =
        `
        <p><strong>Public Key:</strong>
        (${publicKey.x}, ${publicKey.y})</p>

        <p><strong>Shared Secret:</strong>
        x = ${secret}</p>
        `;
}

function eccDecrypt() {

    const k =
        parseInt(
            document.getElementById("eccKey").value
        );

    const publicKey =
        scalarMultiply(k, G);

    const secret =
        publicKey.infinity
            ? 0
            : publicKey.x;

    const plaintext =
        currentCipher.map(
            v =>
                String.fromCharCode(
                    v ^ secret
                )
        ).join("");

    document.getElementById("eccOutput").innerHTML =
        `
        Plaintext:
        ${plaintext}
        `;
}

/* =====================================================
   CAESAR
===================================================== */

function shiftChar(ch, shift) {

    if (!/[a-z]/i.test(ch))
        return ch;

    const base =
        ch === ch.toUpperCase()
            ? 65
            : 97;

    return String.fromCharCode(
        ((ch.charCodeAt(0) - base + shift + 26) % 26)
        + base
    );
}

function caesarEncrypt() {

    const shift =
        parseInt(
            document.getElementById("caesarShift").value
        );

    const message =
        document.getElementById("caesarMessage").value;

    const cipher =
        [...message]
        .map(ch => shiftChar(ch, shift))
        .join("");

    document.getElementById("attackCiphertext").value =
        cipher;

    document.getElementById("caesarOutput").innerHTML =
        cipher;
}

function caesarDecrypt() {

    const shift =
        parseInt(
            document.getElementById("caesarShift").value
        );

    const message =
        document.getElementById("caesarMessage").value;

    const plain =
        [...message]
        .map(ch => shiftChar(ch, -shift))
        .join("");

    document.getElementById("caesarOutput").innerHTML =
        plain;
}

/* =====================================================
   CORPUS ANALYSIS
===================================================== */

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
        new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label:
                        "Letter Frequency",
                    data: values,
                    backgroundColor:
                        "#1f3c88"
                }]
            }
        });
}

/* =====================================================
   CAESAR ATTACK
===================================================== */

function scoreText(text) {

    let score = 0;

    for (let c of text.toUpperCase()) {
        score += languageFreq[c] || 0;
    }

    return score;
}

function recoverCaesar() {

    const cipher =
        document.getElementById(
            "attackCiphertext"
        ).value;

    let bestShift = 0;
    let bestScore = -Infinity;
    let bestPlain = "";

    for (let shift = 0; shift < 26; shift++) {

        const candidate =
            [...cipher]
            .map(
                ch =>
                    shiftChar(
                        ch,
                        -shift
                    )
            )
            .join("");

        const score =
            scoreText(candidate);

        if (score > bestScore) {

            bestScore = score;
            bestShift = shift;
            bestPlain = candidate;
        }
    }

    document.getElementById("attackOutput").innerHTML =
        `
        Recovered shift:
        ${bestShift}
        <br><br>
        Decrypted text:
        ${bestPlain}
        `;
}

/* =====================================================
   ECC BRUTE FORCE
===================================================== */

function bruteForceECC() {

    const text =
        document.getElementById(
            "publicKeyInput"
        ).value;

    const match =
        text.match(/\((\d+),\s*(\d+)\)/);

    if (!match)
        return;

    const x = parseInt(match[1]);
    const y = parseInt(match[2]);

    for (let k = 1; k <= 30; k++) {

        const Q =
            scalarMultiply(
                k,
                G
            );

        if (
            !Q.infinity &&
            Q.x === x &&
            Q.y === y
        ) {

            document.getElementById(
                "bruteforceOutput"
            ).innerHTML =
            `
            Recovered private key:
            ${k}
            `;

            return;
        }
    }

    document.getElementById(
        "bruteforceOutput"
    ).innerHTML =
        "Key not found";
}

/* =====================================================
   EVENTS
===================================================== */

document
.getElementById("eccEncryptBtn")
.addEventListener(
    "click",
    eccEncrypt
);

document
.getElementById("eccDecryptBtn")
.addEventListener(
    "click",
    eccDecrypt
);

document
.getElementById("caesarEncryptBtn")
.addEventListener(
    "click",
    caesarEncrypt
);

document
.getElementById("caesarDecryptBtn")
.addEventListener(
    "click",
    caesarDecrypt
);

document
.getElementById("analyzeCorpusBtn")
.addEventListener(
    "click",
    analyzeCorpus
);

document
.getElementById("attackBtn")
.addEventListener(
    "click",
    recoverCaesar
);

document
.getElementById("bruteforceBtn")
.addEventListener(
    "click",
    bruteForceECC
);
