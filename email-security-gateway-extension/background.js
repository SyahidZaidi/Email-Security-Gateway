// Keep track of notified emails
let notifiedEmails = new Set(); // Set to store notified email IDs

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

// Function to show notifications
function showNotification(email) {
    const sender = email.sender || "Unknown Sender";
    const subject = email.subject || "No Subject";
    const preview = email.body?.substring(0, 100) || "No Content"; // Show only the first 100 characters

    chrome.notifications.create(email.id, {
        type: "basic",
        iconUrl: "icons/alien.png", // Update the path to your icon
        title: `📧 New Email from ${sender}`,
        message: `Subject: ${subject}\nPreview: ${preview}`,
        buttons: [
            { title: "Mark as Read" }
        ],
        priority: 2,
    });
}

// Listener for notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (buttonIndex === 0) { // "Mark as Read" button clicked
        try {
            const token = await authenticate(); // Ensure the user is authenticated
            await markAsRead(token, notificationId); // Mark the email as read
            console.log(`Email ${notificationId} marked as read.`);
            chrome.notifications.clear(notificationId); // Clear the notification
        } catch (error) {
            console.error("Error marking email as read:", error);
        }
    }
});

// Periodically fetch new emails and show notifications for unread ones
const EMAIL_POLL_INTERVAL = 10000; // 10 seconds
setInterval(async () => {
    try {
        const token = await authenticate();
        const emails = await fetchEmails(token);

        const newEmails = emails.filter(email => !notifiedEmails.has(email.id));
        newEmails.forEach(email => {
            showNotification(email); // Show notification
            notifiedEmails.add(email.id); // Add email ID to notified list
        });
    } catch (error) {
        console.error("Error fetching new emails:", error);
    }
}, EMAIL_POLL_INTERVAL);

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
            removeLabelIds: ["UNREAD"], // Remove the "UNREAD" label to mark as read
        }),
    });

    if (!response.ok) {
        throw new Error(`Error marking email as read: ${response.statusText}`);
    }
}

// Fetch the list of emails using the access token
async function fetchEmails(token) {
    try {
        // Check the user's preference for unread emails
        const { unreadEmailsOnly } = await new Promise(resolve =>
            chrome.storage.sync.get('unreadEmailsOnly', resolve)
        );

        const query = unreadEmailsOnly ? "is:unread" : ""; // Fetch both read and unread emails if unchecked
        const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
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
        console.log("Fetched email data:", data);

        // Check if there are any messages, otherwise return an empty array
        if (!data.messages) {
            return [];
        }

        const emailsDetailsPromises = data.messages.map(message =>
            fetchEmailDetails(token, message.id)
        );
        return await Promise.all(emailsDetailsPromises);
    } catch (error) {
        console.error("Error during email fetch:", error);
        throw error;
    }
}

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
    console.log("Full email data:", emailData); // Debugging log

    // Extract headers safely
    const headers = emailData.payload.headers || [];
    const sender = headers.find(header => header.name === "From")?.value || "Unknown Sender";
    const subject = headers.find(header => header.name === "Subject")?.value || "No Subject";
    const dateHeader = headers.find(header => header.name === "Date")?.value;

    // Format the date for display
    let formattedDate = "No Date";
    if (dateHeader) {
        const parsedDate = new Date(dateHeader);
        if (!isNaN(parsedDate)) {
            formattedDate = parsedDate.toLocaleString(); // Format date as a readable string
        }
    }

    // Extract body content
    let body = "No Content";
    if (emailData.payload.parts) {
        const part = emailData.payload.parts.find(part => part.mimeType === "text/plain" || part.mimeType === "text/html");
        if (part?.body?.data) {
            body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
    }

    return { id: messageId, sender, subject, date: formattedDate, body };
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
