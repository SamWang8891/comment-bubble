import {getHostname} from './hostname.js';

(async () => {
    try {
        // Get the hostname of the server
        const hostname = await getHostname();

        // Redirect to the target page (if it is a special page)
        await doRedir(window.location.pathname, hostname);

        // Load and display all comments
        await loadAllComments(hostname);
        
        // Set up auto-refresh for new comments
        await setupAutoRefresh(hostname);
    } catch (error) {
        console.error('Initialization error:', error);
        alert('An error occurred during initialization. Please try again.');
    }
})();

/**
 * Redirect to the target page (if it is a special page)
 * @param suffix - The path suffix from location.pathname
 * @param hostname - The hostname of the server
 * @returns {Promise<void>}
 */
async function doRedir(suffix, hostname) {
    // If it is the home page "/", do nothing
    if (suffix === '/') return;

    // List of pages that need to be redirected directly
    const otherPages = ['/admin', '/login', '/logout', '/change_pass', '/disp'];
    if (otherPages.includes(suffix)) {
        // Redirect to the page (ex: /admin -> /admin/)
        // console.log(suffix);
        window.location.href = `${hostname}${suffix}/`;
        return;
    }

    // Make the page display "Redirecting..." when system doing the redirection
    const whole = document.getElementById('js-whole');
    whole.innerHTML = '<h1 class="center">Redirecting...</h1>';

    // If matched none of the above, try to search the record
    const shortKey = suffix.substring(1); // Get rid of the leading "/"
    try {
        const response = await fetch(`${hostname}/api/v1/search_record?` + new URLSearchParams({
            short_key: shortKey,
        }).toString(), {
            method: 'GET',
        });

        const data = await response.json();
        if (data.status) {
            // If the record is found, redirect to the original URL
            window.location.href = data.data.original_url;
        } else {
            // If the record is not found, redirect to the home page
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Redirection error:', error);
        // Redirect to the home page when an error occurs
        window.location.href = '/';
    }
}




/**
 * Load and display all comments on the index page
 * @param {string} hostname - The hostname of the server
 */
async function loadAllComments(hostname) {
    try {
        const response = await fetch(`${hostname}/api/v1/get_all_records`, {
            method: 'GET',
        });
        const data = await response.json();

        // Check if the request was successful
        if (data.status && data.data && data.data.records) {
            renderAllComments(data.data.records);
        } else {
            // Handle case where no comments are found or request failed
            renderAllComments([]);
        }
    } catch (error) {
        console.error('Error loading all comments:', error);
    }
}

/**
 * Render all comments as floating bubbles
 * @param {Array<string>} comments - Array of comment strings
 */
function renderAllComments(comments) {
    const bubbleContainer = document.querySelector('.js-bubble-container');
    if (!bubbleContainer) return;

    // Clear existing bubbles
    bubbleContainer.innerHTML = '';

    // if (comments.length === 0) {
    //     // Show a welcome message as a bubble
    //     createFloatingBubble(bubbleContainer, 'Welcome to the Comment Board! Be the first to comment!', 0, true);
    //     return;
    // }

    // Create floating bubbles for each comment
    comments.forEach((comment, index) => {
        const commentNumber = comments.length - index;
        // Stagger the creation of bubbles
        setTimeout(() => {
            createFloatingBubble(bubbleContainer, comment, commentNumber);
        }, index * 2000); // 2 second delay between each bubble
    });

    // Set up continuous bubble spawning
    setupContinuousBubbles(bubbleContainer, comments);
}

/**
 * Create a floating bubble with comment
 * @param {HTMLElement} container - Container element
 * @param {string} comment - Comment text
 * @param {number} number - Comment number
 * @param {boolean} isWelcome - Whether this is a welcome message
 */
function createFloatingBubble(container, comment, number, isWelcome = false) {
    const bubble = document.createElement('div');
    bubble.className = 'comment-bubble floating';
    
    // Create random movement parameters
    const movement = generateRandomMovement();
    
    // Apply random movement
    applyRandomAnimation(bubble, movement);
    
    // Create bubble content
    const truncatedComment = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
    
    bubble.innerHTML = `
        <div class="comment-bubble-text" title="${escapeHtml(comment)}">
            ${escapeHtml(truncatedComment)}
        </div>
    `;
    
    // Add click event to show full comment
    bubble.addEventListener('click', () => {
        showFullComment(comment, number);
    });
    
    // Add bubble to container
    container.appendChild(bubble);
    
    // Remove bubble after animation completes
    const animationDuration = isWelcome ? 25000 : movement.duration;
    setTimeout(() => {
        if (bubble.parentNode) {
            bubble.remove();
        }
    }, animationDuration);
}

/**
 * Generate random movement parameters for bubble animation
 * @returns {Object} - Movement parameters
 */
function generateRandomMovement() {
    // Random starting position (edges of screen)
    const startSide = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX, startY, endX, endY;
    
    // Set starting position based on random side with safer margins
    switch (startSide) {
        case 0: // Start from top
            startX = Math.random() * 120 - 10; // -10 to 110vw
            startY = -15; // Above screen
            break;
        case 1: // Start from right
            startX = 115; // Right of screen
            startY = Math.random() * 120 - 10; // -10 to 110vh
            break;
        case 2: // Start from bottom
            startX = Math.random() * 120 - 10; // -10 to 110vw
            startY = 115; // Below screen
            break;
        case 3: // Start from left
            startX = -15; // Left of screen
            startY = Math.random() * 120 - 10; // -10 to 110vh
            break;
    }
    
    // Random ending position (ensure it's different from start)
    let endSide;
    do {
        endSide = Math.floor(Math.random() * 4);
    } while (endSide === startSide && Math.random() < 0.7); // 70% chance to avoid same side
    
    switch (endSide) {
        case 0: // End at top
            endX = Math.random() * 120 - 10;
            endY = -15;
            break;
        case 1: // End at right
            endX = 115;
            endY = Math.random() * 120 - 10;
            break;
        case 2: // End at bottom
            endX = Math.random() * 120 - 10;
            endY = 115;
            break;
        case 3: // End at left
            endX = -15;
            endY = Math.random() * 120 - 10;
            break;
    }
    
    // Random speed (duration between 15-45 seconds)
    const duration = 15000 + Math.random() * 30000;
    
    // Random rotation
    const rotation = (Math.random() - 0.5) * 720; // -360 to 360 degrees
    
    return {
        startX: startX + 'vw',
        startY: startY + 'vh',
        endX: endX + 'vw',
        endY: endY + 'vh',
        duration: duration,
        rotation: rotation
    };
}

/**
 * Apply random animation to a bubble element
 * @param {HTMLElement} bubble - The bubble element
 * @param {Object} movement - Movement parameters
 * @param {number} delay - Optional delay in seconds
 */
function applyRandomAnimation(bubble, movement, delay = 0) {
    // Create unique animation name
    const animationId = 'bubble-' + Math.random().toString(36).substr(2, 9);
    
    // Set initial position to prevent flash at (0,0)
    bubble.style.transform = `translate(${movement.startX}, ${movement.startY}) rotate(0deg)`;
    bubble.style.opacity = '0';
    
    // Create keyframes
    const keyframes = `
        @keyframes ${animationId} {
            0% {
                transform: translate(${movement.startX}, ${movement.startY}) rotate(0deg);
                opacity: 0;
            }
            3% {
                opacity: 1;
            }
            97% {
                opacity: 1;
            }
            100% {
                transform: translate(${movement.endX}, ${movement.endY}) rotate(${movement.rotation}deg);
                opacity: 0;
            }
        }
    `;
    
    // Add keyframes to head
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // Apply animation to bubble with proper settings
    bubble.style.animation = `${animationId} ${movement.duration}ms linear forwards`;
    bubble.style.animationDelay = `${delay}s`;
    bubble.style.animationFillMode = 'both';
    
    // Debug log to track problematic animations
    console.log(`Animation ${animationId}: Start(${movement.startX}, ${movement.startY}) -> End(${movement.endX}, ${movement.endY})`);
    
    // Clean up keyframes after animation
    setTimeout(() => {
        if (style.parentNode) {
            style.remove();
        }
    }, movement.duration + delay * 1000 + 1000);
}

/**
 * Set up continuous bubble spawning with overlap prevention
 * @param {HTMLElement} container - Container element
 * @param {Array<string>} comments - Array of comments
 */
function setupContinuousBubbles(container, comments) {
    if (comments.length === 0) return;
    
    const activeBubbles = new Set();
    const maxConcurrentBubbles = 6; // Limit concurrent bubbles
    
    setInterval(() => {
        // Clean up finished bubbles from tracking
        activeBubbles.forEach(bubble => {
            if (!bubble.parentNode) {
                activeBubbles.delete(bubble);
            }
        });
        
        // Only create new bubble if under limit
        if (activeBubbles.size < maxConcurrentBubbles) {
            const randomIndex = Math.floor(Math.random() * comments.length);
            const randomComment = comments[randomIndex];
            const commentNumber = comments.length - randomIndex;
            
            const bubble = createFloatingBubbleWithTracking(container, randomComment, commentNumber, activeBubbles);
            if (bubble) {
                activeBubbles.add(bubble);
            }
        }
    }, 4000); // Create a new bubble every 4 seconds (increased from 3)
}

/**
 * Create a floating bubble with better positioning to prevent overlaps
 * @param {HTMLElement} container - Container element
 * @param {string} comment - Comment text
 * @param {number} number - Comment number
 * @param {Set} activeBubbles - Set of currently active bubbles
 * @returns {HTMLElement|null} - The created bubble or null if couldn't place
 */
function createFloatingBubbleWithTracking(container, comment, number, activeBubbles) {
    const bubble = document.createElement('div');
    bubble.className = 'comment-bubble floating';
    
    // Create random movement parameters
    const movement = generateRandomMovement();
    
    // Apply random movement with staggered delay to prevent clustering
    const baseDelay = Math.random() * 8; // 0-8 seconds
    applyRandomAnimation(bubble, movement, baseDelay);
    
    // Create bubble content
    const truncatedComment = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
    
    bubble.innerHTML = `
        <div class="comment-bubble-text" title="${escapeHtml(comment)}">
            ${escapeHtml(truncatedComment)}
        </div>
    `;
    
    // Add click event to show full comment
    bubble.addEventListener('click', () => {
        showFullComment(comment, number);
    });
    
    // Add bubble to container
    container.appendChild(bubble);
    
    // Remove bubble after animation completes with some buffer
    setTimeout(() => {
        if (bubble.parentNode) {
            bubble.remove();
        }
        activeBubbles.delete(bubble);
    }, movement.duration + 1000); // Add 1 second buffer
    
    return bubble;
}

/**
 * Show full comment in an alert or modal
 * @param {string} comment - Full comment text
 * @param {number} number - Comment number
 */
function showFullComment(comment, number) {
    alert(`Comment #${number}:\n\n${comment}`);
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Set up auto-refresh to fetch new comments periodically
 * @param {string} hostname - The hostname of the server
 */
async function setupAutoRefresh(hostname) {
    let lastComments = [];
    
    // Initialize with current comments
    try {
        const response = await fetch(`${hostname}/api/v1/get_all_records`, {
            method: 'GET',
        });
        const data = await response.json();
        
        if (data.status && data.data && data.data.records) {
            lastComments = [...data.data.records];
        }
    } catch (error) {
        console.error('Initial comment fetch error:', error);
    }
    
    // Check for new comments every 3 seconds
    setInterval(async () => {
        try {
            console.log('Checking for new comments...');
            const response = await fetch(`${hostname}/api/v1/get_all_records`, {
                method: 'GET',
            });
            const data = await response.json();
            
            console.log('Fetched comments:', data.data?.records?.length || 0, 'vs last known:', lastComments.length);
            
            if (data.status && data.data && data.data.records) {
                const currentComments = data.data.records;
                
                // Check if there are new comments
                if (currentComments.length > lastComments.length) {
                    // Since comments come in reverse order (newest first), 
                    // new comments are at the beginning of the array
                    const newCommentCount = currentComments.length - lastComments.length;
                    const newComments = currentComments.slice(0, newCommentCount);
                    
                    console.log('New comments detected:', newComments);
                    
                    // Add bubbles for new comments only
                    addNewCommentBubbles(newComments, currentComments.length);
                    
                    // Update the stored comments
                    lastComments = [...currentComments];
                }
            }
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }, 3000); // Check every 3 seconds
}

/**
 * Add bubbles for new comments without affecting existing ones
 * @param {Array<string>} newComments - Array of new comment strings
 * @param {number} totalComments - Total number of comments
 */
function addNewCommentBubbles(newComments, totalComments) {
    const bubbleContainer = document.querySelector('.js-bubble-container');
    if (!bubbleContainer) {
        console.error('Bubble container not found');
        return;
    }

    console.log('Adding new comment bubbles:', newComments.length);

    // Create bubbles for each new comment with staggered timing
    newComments.forEach((comment, index) => {
        // Since comments are in reverse order, newest comments get highest numbers
        const commentNumber = totalComments - index;
        
        console.log(`Creating bubble ${commentNumber} for comment: "${comment.substring(0, 30)}..."`);
        
        // Stagger the creation of new bubbles
        setTimeout(() => {
            createFloatingBubble(bubbleContainer, comment, commentNumber);
        }, index * 500); // 0.5 second delay between each new bubble (reduced from 1 second)
    });
}
