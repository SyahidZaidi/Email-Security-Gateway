// Keywords and patterns to detect phishing or malicious content
const suspiciousKeywords = ["urgent", "password", "click here", "verify your account"];
const phishingURLs = ["http://fakebank.com", "http://maliciouslink.com"]; // example URLs

// Function to scan the page
function scanPage() {
    let pageContent = document.body.innerText;

    // Check for suspicious keywords
    suspiciousKeywords.forEach(keyword => {
        if (pageContent.toLowerCase().includes(keyword)) {
            console.warn(`Suspicious keyword detected: ${keyword}`);
        }
    });

    // Check for phishing URLs
    phishingURLs.forEach(url => {
        if (pageContent.includes(url)) {
            console.warn(`Suspicious URL detected: ${url}`);
        }
    });
}

// Run scanPage whenever the content script is loaded
scanPage();

function notifyUser(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Security Alert',
        message: message
    });
}

// Call this in scanPage() if a keyword or URL is detected
notifyUser('Suspicious content detected in your email!');

function addWarningBanner() {
    const banner = document.createElement('div');
    banner.textContent = "Warning: Potential phishing content detected!";
    banner.style.cssText = "position:fixed;top:0;width:100%;background-color:red;color:white;text-align:center;padding:10px;z-index:1000;";
    document.body.prepend(banner);
}

// Call addWarningBanner() if threats are detected
addWarningBanner();
