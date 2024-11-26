document.addEventListener("DOMContentLoaded", function() {
    // Get elements related to key generation and encryption
    const regenerateKeyBtn = document.getElementById("regenerate-key");
    const encryptButton = document.getElementById("encrypt-button");
    const decryptButton = document.getElementById("decrypt-button");
    const secretKeyElement = document.getElementById("secret-key");
    const messageToEncrypt = document.getElementById("message-to-encrypt");
    const encryptedMessage = document.getElementById("encrypted-message");
    const messageToDecrypt = document.getElementById("message-to-decrypt");
    const inputSecretKey = document.getElementById("input-secret-key");
    const decryptedMessage = document.getElementById("decrypted-message");
    const copyButton = document.getElementById("copy-key");
    const secretKeyDiv = document.getElementById("secret-key");


    copyButton.addEventListener("click", () => {
        const secretKey = secretKeyDiv.textContent.trim(); // Get the key text
        if (secretKey !== "Your Secret Key will be shown here" && secretKey !== "") {
            navigator.clipboard.writeText(secretKey).then(() => {
                alert("Key copied to clipboard!");
            }).catch((error) => {
                alert("Failed to copy the key. Try again.");
                console.error("Copy error:", error);
            });
        } else {
            alert("No key to copy!");
        }
    });


    // Function to generate a random secret key
    function generateRandomKey() {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Event listener to regenerate and display the secret key
    if (regenerateKeyBtn && secretKeyElement) {
        regenerateKeyBtn.addEventListener("click", function() {
            const newKey = generateRandomKey();
            secretKeyElement.textContent = newKey;
        });
    }

    // Event listener to encrypt the message
    if (encryptButton && messageToEncrypt && encryptedMessage && secretKeyElement) {
        encryptButton.addEventListener("click", function() {
            const secretKey = secretKeyElement.textContent;
            if (!secretKey) {
                alert("Please generate a secret key first!");
                return;
            }
            const message = messageToEncrypt.value;
            if (!message) {
                alert("Please enter a message to encrypt.");
                return;
            }
            const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
            encryptedMessage.value = encrypted;
        });
    }

    // Event listener to decrypt the message
    if (decryptButton && messageToDecrypt && decryptedMessage && inputSecretKey) {
        decryptButton.addEventListener("click", function() {
            const secretKey = inputSecretKey.value;
            if (!secretKey) {
                alert("Please enter your secret key.");
                return;
            }
            const encrypted = messageToDecrypt.value;
            if (!encrypted) {
                alert("Please enter an encrypted message.");
                return;
            }
            try {
                const decrypted = CryptoJS.AES.decrypt(encrypted, secretKey).toString(CryptoJS.enc.Utf8);
                if (!decrypted) {
                    throw new Error("Invalid decryption");
                }
                decryptedMessage.value = decrypted;
            } catch (error) {
                alert("Decryption failed. Please check the encrypted message and secret key.");
                decryptedMessage.value = "";
            }
        });
    }
});
