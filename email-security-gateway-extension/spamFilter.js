// spamFilter.js

// Add a spam word to storage
function addSpamWord(word) {
    chrome.storage.sync.get({ spamWords: [] }, (data) => {
        const spamWords = data.spamWords;
        spamWords.push(word);
        chrome.storage.sync.set({ spamWords });
    });
}

// Remove a spam word from storage
function removeSpamWord(word) {
    chrome.storage.sync.get({ spamWords: [] }, (data) => {
        let spamWords = data.spamWords || [];
        spamWords = spamWords.filter(spamWord => spamWord !== word);
        chrome.storage.sync.set({ spamWords });
    });
}

// Retrieve spam words from storage
function getSpamWords() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({ spamWords: [] }, (data) => {
            resolve(data.spamWords || []);
        });
    });
}

// Check if an email is spam
function isSpam(email, spamKeywords) {
    const { subject = "", body = "" } = email;
    const lowerCaseBody = body.toLowerCase();
    const lowerCaseSubject = subject.toLowerCase();

    return spamKeywords.some(keyword =>
        lowerCaseSubject.includes(keyword.toLowerCase().trim()) || 
        lowerCaseBody.includes(keyword.toLowerCase().trim())
    );
}
