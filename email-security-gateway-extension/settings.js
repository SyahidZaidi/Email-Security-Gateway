document.addEventListener('DOMContentLoaded', () => {
    const spamFilter = document.getElementById('spam-filter');
    const maliciousContent = document.getElementById('malicious-content');
    const saveSettingsButton = document.getElementById('save-settings');
    const spamWordInput = document.getElementById('spam-word');
    const addSpamWordButton = document.getElementById('add-spam-word');
    const spamList = document.getElementById('spam-list');
    const threatWordInput = document.getElementById('threat-word');
    const addThreatWordButton = document.getElementById('add-threat-word');
    const threatList = document.getElementById('threat-list');
    const maliciousDomainInput = document.getElementById('malicious-domain');
    const addDomainButton = document.getElementById('add-domain');
    const domainList = document.getElementById('domain-list');
    const secretKeyDisplay = document.getElementById('secret-key');
    const regenerateKeyButton = document.getElementById('regenerate-key');
    const unreadEmailsCheckbox = document.getElementById('unread-emails-only');
    

    // Encryption and Decryption elements
    const encryptButton = document.getElementById('encrypt-button');
    const decryptButton = document.getElementById('decrypt-button');
    const messageToEncrypt = document.getElementById('message-to-encrypt');
    const encryptedMessage = document.getElementById('encrypted-message');
    const messageToDecrypt = document.getElementById('message-to-decrypt');
    const decryptedMessage = document.getElementById('decrypted-message');

    // Load existing settings on document load
    loadSettings();

    // Event listeners
    saveSettingsButton.addEventListener('click', saveSettings);
    addSpamWordButton.addEventListener('click', () => handleAddWord(spamWordInput, 'spamWords', spamList));
    addThreatWordButton.addEventListener('click', () => handleAddWord(threatWordInput, 'threatKeywords', threatList));
    addDomainButton.addEventListener('click', () => handleAddWord(maliciousDomainInput, 'maliciousDomains', domainList));
    regenerateKeyButton.addEventListener('click', regenerateKey);

    encryptButton.addEventListener('click', encryptMessage);
    decryptButton.addEventListener('click', decryptMessage);

    // New event listener for decrypting using user-provided secret key
    document.getElementById('decrypt-button').addEventListener('click', function() {
        const encryptedMessage = document.getElementById('message-to-decrypt').value; // Get the encrypted message
        const inputSecretKey = document.getElementById('input-secret-key').value; // Get the user-provided secret key

        // Decrypt the message using the CryptoJS library
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedMessage, inputSecretKey);

        // Convert decrypted bytes to a string
        const decryptedMessageValue = decryptedBytes.toString(CryptoJS.enc.Utf8);

        // Display the decrypted message or an error if decryption fails
        document.getElementById('decrypted-message').value = decryptedMessageValue ? decryptedMessageValue : "Invalid key or message";
    });

    spamFilter.addEventListener('change', () => {
        chrome.storage.sync.set({ spamFilter: spamFilter.checked });
    });
    
    maliciousContent.addEventListener('change', () => {
        chrome.storage.sync.set({ maliciousContent: maliciousContent.checked });
    });

    
    // Load settings from Chrome storage
    function loadSettings() {
        chrome.storage.sync.get(['spamFilter', 'maliciousContent', 'secretKey', 'unreadEmailsOnly'], (data) => {
            spamFilter.checked = data.spamFilter || false;
            maliciousContent.checked = data.maliciousContent || false;
            unreadEmailsCheckbox.checked = data.unreadEmailsOnly || false;
            loadWords('spamWords', spamList);
            loadWords('threatKeywords', threatList);
            loadWords('maliciousDomains', domainList);

            if (data.secretKey) {
                secretKeyDisplay.textContent = data.secretKey;
            } else {
                const newKey = generateRandomKey(32);
                secretKeyDisplay.textContent = newKey;
                chrome.storage.sync.set({ secretKey: newKey });
            }
        });
    }

// Save settings to Chrome storage
function saveSettings() {
    chrome.storage.sync.set({
        spamFilter: spamFilter.checked,
        maliciousContent: maliciousContent.checked,
        unreadEmailsOnly: unreadEmailsCheckbox.checked
    }, () => {
        alert('Settings Saved!');
    });
}
// Event listener for saving settings
unreadEmailsCheckbox.addEventListener('change', saveSettings);

loadSettings(); // Load settings on page load
});

// Generic function to handle adding words
function handleAddWord(inputElement, storageKey, listElement) {
    const word = inputElement.value.trim().toLowerCase(); // Convert to lowercase for case-insensitivity
    if (word) {
        addWordToStorage(word, storageKey);
        addWordToList(word, listElement, storageKey);
        inputElement.value = ''; // Clear input
    } else {
        alert(`Please enter a valid ${storageKey.replace('Words', '').toLowerCase()} word.`);
    }
}



// Add word to Chrome storage
function addWordToStorage(word, key) {
    chrome.storage.sync.get(key, (data) => {
        const words = data[key] || [];
        words.push(word);
        chrome.storage.sync.set({ [key]: words });
    });
}

// Load words from Chrome storage and populate lists
function loadWords(key, listElement) {
    chrome.storage.sync.get(key, (data) => {
        (data[key] || []).forEach(word => addWordToList(word, listElement, key));
    });
}

function addWordToList(word, listElement, storageKey) {
    const listItem = document.createElement('li');
    listItem.textContent = word;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '🗑️';
    deleteButton.classList.add('delete-button');
    deleteButton.onclick = () => deleteWord(word, storageKey, listElement);

    const editButton = document.createElement('button');
    editButton.textContent = '✏️';
    editButton.classList.add('edit-button');
    editButton.onclick = () => editWord(word, listItem, storageKey, listElement);

    listItem.appendChild(deleteButton);
    listItem.appendChild(editButton);
    listElement.appendChild(listItem);
}


// Delete word from Chrome storage and remove from UI
function deleteWord(word, key, listElement) {
    chrome.storage.sync.get(key, (data) => {
        // Filter out the word to delete
        const updatedWords = (data[key] || []).filter(w => w !== word);

        // Update the storage
        chrome.storage.sync.set({ [key]: updatedWords }, () => {
            // Find and remove the list item in the UI
            listElement.querySelectorAll('li').forEach(item => {
                // Check if the item's text includes the word
                if (item.textContent.includes(word)) {
                    listElement.removeChild(item);
                }
            });
        });
    });
}



function editWord(oldWord, listItem, storageKey) {
    // Prompt user for new word
    const newWord = prompt("Edit Word:", oldWord);

    // If the user entered a new word and it's different from the old one
    if (newWord && newWord !== oldWord) {
        chrome.storage.sync.get(storageKey, (data) => {
            // Update words in Chrome storage
            const updatedWords = (data[storageKey] || []).map(word =>
                word === oldWord ? newWord : word
            );
            chrome.storage.sync.set({ [storageKey]: updatedWords }, () => {
                // Clear the existing buttons to avoid duplication
                listItem.innerHTML = '';

                // Update the UI with the new word
                listItem.textContent = newWord;

                // Re-add the delete and edit buttons
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '🗑️';
                deleteButton.classList.add('delete-button');
                deleteButton.onclick = () => {
                    deleteWord(newWord, storageKey, listItem.parentNode);
                };

                const editButton = document.createElement('button');
                editButton.textContent = '✏️';
                editButton.classList.add('edit-button');
                editButton.onclick = () => {
                    editWord(newWord, listItem, storageKey);
                };

                listItem.appendChild(deleteButton);
                listItem.appendChild(editButton);
            });
        });
    }
}





    // Encryption function
    function encryptMessage() {
        chrome.storage.sync.get('secretKey', (data) => {
            const key = data.secretKey;
            if (!key) return alert('Secret key is missing. Please regenerate the key.');

            const message = messageToEncrypt.value;
            if (!message) return alert('Please enter a message to encrypt.');

            const encrypted = CryptoJS.AES.encrypt(message, key).toString();
            encryptedMessage.value = encrypted;
        });
    }

    function decryptMessage() {
        chrome.storage.sync.get('secretKey', (data) => {
            const key = data.secretKey;
            if (!key) return; // No alert, just return if the key is missing.
    
            const encryptedText = messageToDecrypt.value.trim(); // Trim any whitespace
            if (!encryptedText) return; // No alert, just return if no encrypted message is provided.
    
            try {
                // Attempt to decrypt the message
                const bytes = CryptoJS.AES.decrypt(encryptedText, key);
                const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
                // If the decrypted string is not empty, display it in the textarea
                if (decrypted) {
                    decryptedMessage.value = decrypted; // Display the decrypted message
                } 
                // No alert for empty decryption result
            } catch (error) {
                console.error('Decryption Error:', error); // Log error details without alert
                // No alert for decryption failure
            }
        });
    }
    

    // Key generation function
    function generateRandomKey(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let key = '';
        for (let i = 0; i < length; i++) {
            key += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return key;
    }

    function regenerateKey() {
        const newKey = generateRandomKey(32);
        secretKeyDisplay.textContent = newKey;
        chrome.storage.sync.set({ secretKey: newKey });
        alert('New secret key generated and saved!');
    }



