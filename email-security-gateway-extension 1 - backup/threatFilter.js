// threatFilter.js

function isThreat(email, threatKeywords, maliciousDomains) {
    const { subject = "", body = "", sender = "" } = email;
    const lowerCaseBody = body.toLowerCase();
    const lowerCaseSubject = subject.toLowerCase();
    const lowerCaseSender = sender.toLowerCase();

    // Check if the subject or body contains any threat keywords
    const hasThreatKeyword = threatKeywords.some(keyword =>
        lowerCaseSubject.includes(keyword.toLowerCase().trim()) || 
        lowerCaseBody.includes(keyword.toLowerCase().trim())
    );

    // Check if the sender's domain is in the list of malicious domains
    const hasMaliciousDomain = maliciousDomains.some(domain => 
        lowerCaseSender.includes(`@${domain.toLowerCase().trim()}`)
    );

    console.log("Email:", email);
    console.log("Has Threat Keyword:", hasThreatKeyword);
    console.log("Has Malicious Domain:", hasMaliciousDomain);

    return hasThreatKeyword || hasMaliciousDomain;
}

async function getThreatKeywordsAndDomains() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({ threatKeywords: [], maliciousDomains: [] }, (data) => {
            console.log("Retrieved from storage - Threat keywords:", data.threatKeywords);
            console.log("Retrieved from storage - Malicious domains:", data.maliciousDomains);
            resolve({
                threatKeywords: data.threatKeywords,
                maliciousDomains: data.maliciousDomains
            });
        });
    });
}

async function refreshEmails() {
    const emails = await getEmailsFromInbox();
    console.log("Retrieved Emails from Inbox:", emails);

    if (!emails || emails.length === 0) {
        console.log("No emails retrieved.");
        return;
    }

    const { threatKeywords, maliciousDomains } = await getThreatKeywordsAndDomains();
    const threatEmails = emails.filter(email => isThreat(email, threatKeywords, maliciousDomains));

    console.log("Filtered Threat Emails:", threatEmails);
    displayEmails(threatEmails);
}
