let notifiedEmails = [];

// Listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("Email Security Gateway Extension Installed");
});

// Poll Gmail API every 10 seconds for new emails
const EMAIL_POLL_INTERVAL = 10000; // 10 seconds

setInterval(async () => {
    try {
        console.log("Checking for new Gmail emails...");
        const token = await authenticate(); // Authenticate and get access token
        const emails = await fetchEmails(token); // Fetch only unread emails from the Gmail API

        // Filter new emails
        const newEmails = emails.filter(email => !notifiedEmails.includes(email.id));

        // Notify the user about new emails
        newEmails.forEach(email => {
            showNotification(email.subject || "No Subject", email.body || "No Content");
            notifiedEmails.push(email.id); // Add to notified list
        });

        console.log("Checked emails. Notifications sent for:", newEmails);
    } catch (error) {
        console.error("Error during email polling:", error);
    }
}, EMAIL_POLL_INTERVAL);

// Authenticate the user using OAuth 2.0
async function authenticate() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error("Authentication failed: " + chrome.runtime.lastError.message));
            } else {
                resolve(token);
            }
        });
    });
}

// Fetch the list of emails using the access token
async function fetchEmails(token) {
    try {
        const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("Error fetching emails:", errorDetails);
            throw new Error(`Error fetching emails: ${errorDetails.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log("Fetched unread email data:", data);

        const emailsDetailsPromises = data.messages.map(message =>
            fetchEmailDetails(token, message.id)
        );
        return await Promise.all(emailsDetailsPromises);
    } catch (error) {
        console.error("Error during email fetch:", error);
        throw error;
    }
}

// Fetch detailed email information
async function fetchEmailDetails(token, messageId) {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Error fetching email details: ${response.statusText}`);
    }

    const emailData = await response.json();
    const emailDetails = {
        id: messageId,
        sender: emailData.payload.headers.find(header => header.name === "From")?.value || "Unknown Sender",
        subject: emailData.payload.headers.find(header => header.name === "Subject")?.value || "No Subject",
        date: emailData.payload.headers.find(header => header.name === "Date")?.value || new Date().toISOString(),
        body: emailData.payload.parts
            ? emailData.payload.parts[0].body.data
                ? atob(emailData.payload.parts[0].body.data.replace(/-/g, '+').replace(/_/g, '/'))
                : "No Content"
            : "No Content",
    };

    return emailDetails;
}

// Handle messages from popup.js for fetching emails
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchEmails") {
        authenticate()
            .then(async (token) => {
                try {
                    const emails = await fetchEmails(token);
                    sendResponse({ messages: emails, error: null });
                } catch (error) {
                    console.error("Error during email fetch:", error);
                    sendResponse({ messages: [], error: error.message });
                }
            })
            .catch((error) => {
                console.error("Authentication failed:", error);
                sendResponse({ messages: [], error: error.message });
            });

        return true; // Allow async sendResponse
    }
});

async function checkForNewEmails() {
    try {
        const token = await authenticate();
        const emails = await fetchEmails(token);

        const newEmails = emails.filter(email => !notifiedEmails.includes(email.id));

        newEmails.forEach(async (email) => {
            showNotification(email.subject || "No Subject", email.body || "No Content");
            await markAsRead(token, email.id);
        });

        console.log("Checked emails. Notifications sent for:", newEmails);
    } catch (error) {
        console.error("Error checking for new emails:", error);
    }
}

// Load notified emails from storage when the extension starts
chrome.storage.local.get("notifiedEmails", (data) => {
    notifiedEmails = data.notifiedEmails || [];
});

// Save notified emails to storage after adding new ones
function saveNotifiedEmails() {
    chrome.storage.local.set({ notifiedEmails });
}

function showNotification(email) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/alien.png", // Replace with your extension icon
        title: `New Email from ${email.sender}`,
        message: email.subject || "No Subject"
    });

    // Add email ID to notified list and save to storage
    notifiedEmails.push(email.id);
    saveNotifiedEmails();

    // Optionally, add click behavior to open Gmail
    chrome.notifications.onClicked.addListener(() => {
        chrome.tabs.create({ url: "https://mail.google.com/" });
    });
}

// Mark email as read in Gmail
async function markAsRead(token, messageId) {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            removeLabelIds: ["UNREAD"],
        }),
    });

    if (!response.ok) {
        throw new Error(`Error marking email as read: ${response.statusText}`);
    }
}
