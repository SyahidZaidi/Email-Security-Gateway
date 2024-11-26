document.addEventListener("DOMContentLoaded", () => {
    loadFilteredEmails();

    document.getElementById('settings-button').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById("refreshButton").addEventListener("click", refreshEmails);

// Function to generate a random secret key
function generateRandomKey(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}

// Function to encrypt and decrypt messages (Optional for debugging)
function encryptMessage(message, secretKey) {
    return CryptoJS.AES.encrypt(message, secretKey).toString();
}

function decryptMessage(encryptedMessage, secretKey) {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
}


// Function to determine if an email is spam based on keywords (relies on spamFilter.js)
function isSpam(email, spamKeywords) {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    console.log("Checking spam for email:", email); // Debugging log
    console.log("Spam Keywords:", spamKeywords); // Debugging log

    return spamKeywords.some(keyword => 
        subject.includes(keyword.toLowerCase()) || body.includes(keyword.toLowerCase())
    );
}

// Function to determine if an email is a threat based on keywords and domains
function isThreat(email, threatKeywords, maliciousDomains) {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    const sender = email.sender.toLowerCase();

    return threatKeywords.some(keyword =>
        subject.includes(keyword.toLowerCase()) || body.includes(keyword.toLowerCase())
    ) || maliciousDomains.some(domain => sender.includes(domain.toLowerCase()));
}

// Function to fetch emails from background.js
async function getEmailsFromInbox() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "fetchEmails" }, (response) => {
            if (response.error) {
                reject(response.error);
            } else {
                resolve(response.messages);
            }
        });
    });
}

// Load filtered emails into the email list table
function loadFilteredEmails(emailListElement) {
    chrome.storage.sync.get('filteredEmails', (data) => {
        const emails = data.filteredEmails || [];
        emailListElement.innerHTML = ''; // Clear existing items

        if (emails.length === 0) {
            const noEmailsRow = document.createElement('tr');
            noEmailsRow.innerHTML = `
                <td colspan="3" class="no-emails">No filtered emails found.</td>
            `;
            emailListElement.appendChild(noEmailsRow);
        } else {
            emails.forEach(email => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${email.sender}</td>
                    <td>${email.subject}</td>
                    <td>${email.date}</td>
                `;
                emailListElement.appendChild(row);
            });
        }
    });
}

async function refreshEmails() {
        // Get emails from inbox
        const emails = await getEmailsFromInbox();
        console.log("Fetched Emails:", emails); // Debugging log
    
        // Get threat settings
        const { threatKeywords, maliciousDomains } = await getThreatKeywordsAndDomains();
        const settings = await getFilterSettings(); // Get current settings
        const spamKeywords = await getSpamWords(); // Get spam keywords from spamFilter.js
    
        // Filter emails based on threat detection
        const threatEmails = emails.filter(email => isThreat(email, threatKeywords, maliciousDomains));
        const spamEmails = emails.filter(email => isSpam(email, spamKeywords)); // Filter spam emails
    
        console.log("Threat Emails:", threatEmails); // Debugging log
        console.log("Spam Emails:", spamEmails); // Debugging log
    
        // Save filtered emails if the malicious content setting is enabled
        const filteredEmails = [];
        if (settings.spamFilter) {
            filteredEmails.push(...spamEmails);
        }
        if (settings.maliciousContent) {
            filteredEmails.push(...threatEmails);
        }
    
        console.log("Filtered Emails:", filteredEmails); // Debugging log
    
        // Save the filtered emails to storage
        saveFilteredEmails(filteredEmails);
        loadFilteredEmails(); // Load the emails to display
    }

    function saveFilteredEmails(emails) {
        chrome.storage.sync.set({ filteredEmails: emails }, () => {
            console.log("Filtered emails saved:", emails);
        });
    }

    function loadFilteredEmails() {
        const emailList = document.getElementById("email-list");
        const noEmailsMessage = document.getElementById("no-emails-message");
    
        getFilterSettings().then(settings => {
            chrome.storage.sync.get({ filteredEmails: [] }, (data) => {
                console.log("Retrieved Filtered Emails:", data.filteredEmails);
                emailList.innerHTML = "";
    
                const shouldShowFilteredEmails = settings.spamFilter || settings.maliciousContent;
    
                if (shouldShowFilteredEmails && data.filteredEmails.length > 0) {
                    noEmailsMessage.style.display = "none";
                    emailList.style.display = "";
                    data.filteredEmails.forEach(email => {
                        const listItem = document.createElement("tr");
                        listItem.innerHTML = `<td>${email.sender}</td><td>${email.subject}</td><td>${email.date}</td>`;
                        emailList.appendChild(listItem);
                    });
                } else {
                    noEmailsMessage.style.display = "block"; 
                    emailList.style.display = "none";
                }
            });
        });
    }


// Utility function to get threat keywords and malicious domains
async function getThreatKeywordsAndDomains() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({ threatKeywords: [], maliciousDomains: [] }, (data) => {
            resolve({
                threatKeywords: data.threatKeywords,
                maliciousDomains: data.maliciousDomains
            });
        });
    });
}

async function getFilterSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ spamFilter: false, maliciousContent: false }, (data) => {
                resolve(data);
            });
        });
    }

    chrome.runtime.onMessage.addListener((request) => {
        if (request.spamFilter !== undefined || request.maliciousContent !== undefined) {
            loadFilteredEmails();
        }
    });

    async function getThreatKeywordsAndDomains() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ threatKeywords: [], maliciousDomains: [] }, (data) => {
                resolve({
                    threatKeywords: data.threatKeywords,
                    maliciousDomains: data.maliciousDomains
                });
            });
        });
    }
});
