import {getHostname} from '../hostname.js';

(async () => {
    try {
        // Get the hostname of the server
        const hostname = await getHostname();

        // Bind the comment events
        await bindCommentEvents(hostname);
    } catch (error) {
        console.error('Initialization error:', error);
        alert('An error occurred during initialization. Please try again.');
    }
})();

/**
 * Bind the comment events (button, form)
 * @param hostname - The hostname of the server
 * @returns {Promise<void>}
 */
async function bindCommentEvents(hostname) {
    // Bind the click event of all "Submit Comment" buttons
    document.querySelectorAll('.js-submit-comment-button').forEach((button) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            doSubmitComment(hostname);
        });
    });

    // Bind the form submission event
    const formElement = document.querySelector('form');
    if (formElement) {
        formElement.addEventListener('submit', (event) => {
            event.preventDefault();
            doSubmitComment(hostname);
        });
    }
}

/**
 * Submit a comment
 * @param {string} hostname - The hostname of the server
 */
async function doSubmitComment(hostname) {
    // Get the user input comment
    const inputField = document.querySelector('.js-comment-field');
    if (!inputField) return;

    let commentText = inputField.value.trim();
    if (!commentText) {
        alert('Please enter a comment.');
        return;
    }

    try {
        // Send the request to create a new comment
        const response = await fetch(`${hostname}/api/v1/create_record`, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({"comment_text": commentText}).toString(),
        });
        const data = await response.json();

        if (!data.status) {
            alert('Failed to post comment. Please try again.');
            return;
        }

        // Clear the input field
        inputField.value = '';

        // Show success message with option to view bubbles
        const viewBubbles = confirm('Comment posted successfully! Would you like to view the bubbles?');
        if (viewBubbles) {
            window.location.href = '/disp';
        }

    } catch (error) {
        console.error('Error posting comment:', error);
        alert('An error occurred while posting the comment. Please try again.');
    }
}