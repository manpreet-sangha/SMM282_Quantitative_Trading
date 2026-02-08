/**
 * Main Application
 * SMM282 Quantitative Trading - Order Book Simulator
 */

// Global instances
let orderBook;
let visualizer;

// Demo state for step-by-step processing
let demoOrders = [];
let currentStep = 0;
const STEPS = {
    ARRIVAL: 0,
    PRICE: 1,
    VISIBILITY: 2,
    TIME: 3
};
let stepNames = ['Orders by Arrival Time', 'Prioritisation by Price', 'Prioritisation by Price, Visibility', 'Prioritisation by Price, Visibility, Time'];

/**
 * Initialize the application
 */
function init() {
    orderBook = new OrderBook();
    visualizer = new OrderBookVisualizer('depthChart');
    
    // Set up form handler (for future custom mode)
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
    
    console.log('Order Book Simulator initialized');
}

/**
 * Select demo mode
 */
function selectMode(mode) {
    document.getElementById('modeSelection').style.display = 'none';
    
    if (mode === 'sample') {
        document.getElementById('sampleDemo').style.display = 'block';
        loadSampleOrders();
    } else if (mode === 'custom') {
        document.getElementById('customDemo').style.display = 'block';
    }
}

/**
 * Go back to mode selection
 */
function backToModeSelection() {
    document.getElementById('sampleDemo').style.display = 'none';
    document.getElementById('customDemo').style.display = 'none';
    document.getElementById('modeSelection').style.display = 'block';
    
    // Reset demo state
    demoOrders = [];
    currentStep = 0;
}

/**
 * Handle order form submission
 */
function handleOrderSubmit(event) {
    event.preventDefault();
    
    const side = document.getElementById('side').value;
    const price = document.getElementById('price').value;
    const quantity = document.getElementById('quantity').value;
    const isVisible = document.getElementById('isVisible').checked;
    
    const orderId = orderBook.generateOrderId();
    const order = new Order(orderId, side, price, quantity, isVisible);
    
    const trades = orderBook.submitOrder(order);
    
    // Update order ID display for next order
    document.getElementById('orderId').value = orderBook.generateOrderId();
    
    // Flash effect for new trades
    if (trades.length > 0) {
        flashTrades(trades);
    }
    
    updateUI();
}

/**
 * Load sample orders to demonstrate the matching engine
 */
function loadSampleOrders() {
    orderBook.clear();
    currentStep = 0;
    
    // Sample orders matching the lecture example (Buy orders)
    demoOrders = [
        { price: 32.01, visible: false, time: '10:00', trader: 5, arrivalOrder: 0 },
        { price: 34.05, visible: true,  time: '10:01', trader: 3, arrivalOrder: 1 },
        { price: 32.01, visible: true,  time: '10:02', trader: 2, arrivalOrder: 2 },
        { price: 33.05, visible: true,  time: '10:11', trader: 1, arrivalOrder: 3 },
        { price: 35.22, visible: true,  time: '10:13', trader: 6, arrivalOrder: 4 },
        { price: 35.33, visible: false, time: '10:21', trader: 4, arrivalOrder: 5 },
        { price: 33.05, visible: true,  time: '10:22', trader: 7, arrivalOrder: 6 },
    ];
    
    // Hide all columns and arrows except column 1
    for (let i = 2; i <= 4; i++) {
        const col = document.getElementById(`stepCol${i}`);
        if (col) col.style.display = 'none';
        const arrow = document.getElementById(`arrow${i - 1}`);
        if (arrow) arrow.style.display = 'none';
    }
    
    // Populate step 1 with arrival order (no movement column)
    populateStepOrders(1, getSortedOrdersForStep(0));
    
    // Update button
    updateProcessButton();
    
    console.log('Sample orders loaded - Click button to see each prioritisation step');
}

/**
 * Get sorted orders for a specific step
 */
function getSortedOrdersForStep(step) {
    let sorted = [...demoOrders];
    
    switch (step) {
        case STEPS.ARRIVAL:
            sorted.sort((a, b) => a.arrivalOrder - b.arrivalOrder);
            break;
            
        case STEPS.PRICE:
            sorted.sort((a, b) => b.price - a.price);
            break;
            
        case STEPS.VISIBILITY:
            sorted.sort((a, b) => {
                if (a.price !== b.price) return b.price - a.price;
                if (a.visible !== b.visible) return a.visible ? -1 : 1;
                return 0;
            });
            break;
            
        case STEPS.TIME:
            sorted.sort((a, b) => {
                if (a.price !== b.price) return b.price - a.price;
                if (a.visible !== b.visible) return a.visible ? -1 : 1;
                return a.time.localeCompare(b.time);
            });
            break;
    }
    
    return sorted;
}

/**
 * Populate orders for a specific step container with movement indicators
 */
function populateStepOrders(stepNum, orders, prevOrders = null) {
    const container = document.getElementById(`ordersStep${stepNum}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create a map of previous positions by trader number
    let prevPositions = {};
    if (prevOrders) {
        prevOrders.forEach((order, index) => {
            prevPositions[order.trader] = index;
        });
    }
    
    // Show movement column for steps 2-4
    const showMovement = prevOrders !== null;
    
    orders.forEach((order, index) => {
        const row = document.createElement('div');
        row.className = 'compact-row';
        row.style.animationDelay = `${index * 0.04}s`;
        
        // Calculate movement for steps 2-4
        let movementHtml = '';
        if (showMovement) {
            const prevPos = prevPositions[order.trader];
            const movement = prevPos - index; // positive = moved up, negative = moved down
            
            if (movement > 0) {
                movementHtml = `<span class="move-indicator move-up">↑${movement}</span>`;
            } else if (movement < 0) {
                movementHtml = `<span class="move-indicator move-down">↓${Math.abs(movement)}</span>`;
            } else {
                movementHtml = `<span class="move-indicator move-same">−</span>`;
            }
        }
        
        // Compact visibility display
        const visDisplay = order.visible ? 'V' : 'H';
        const visClass = order.visible ? 'vis-visible' : 'vis-hidden';
        
        row.innerHTML = `
            <span class="cell-price">${order.price.toFixed(2)}</span>
            <span class="cell-vis ${visClass}">${visDisplay}</span>
            <span class="cell-time">${order.time}</span>
            <span class="cell-trader">${order.trader}</span>
            ${movementHtml}
        `;
        
        container.appendChild(row);
    });
}

/**
 * Update the process button text based on current step
 */
function updateProcessButton() {
    const processBtn = document.getElementById('processBtn');
    if (!processBtn) return;
    
    const buttonTexts = [
        '▶ Apply Price Priority',
        '▶ Apply Visibility Priority',
        '▶ Apply Time Priority (FIFO)',
        '↺ Start Over'
    ];
    
    processBtn.textContent = buttonTexts[currentStep];
}

/**
 * Process the next step of limit order book prioritisation
 */
function processLimitOrderBook() {
    if (demoOrders.length === 0) {
        alert('Please load sample orders first!');
        return;
    }
    
    // If we're at the last step, reset
    if (currentStep >= STEPS.TIME) {
        resetDemo();
        return;
    }
    
    // Get previous step's order for comparison
    const prevOrders = getSortedOrdersForStep(currentStep);
    
    // Move to next step
    currentStep++;
    
    // Show the arrow before the new column
    const arrow = document.getElementById(`arrow${currentStep}`);
    if (arrow) arrow.style.display = 'flex';
    
    // Show the new column
    const stepCol = document.getElementById(`stepCol${currentStep + 1}`);
    if (stepCol) {
        stepCol.style.display = 'block';
        // Populate with sorted orders for this step, passing previous orders for comparison
        populateStepOrders(currentStep + 1, getSortedOrdersForStep(currentStep), prevOrders);
    }
    
    // Update button text
    updateProcessButton();
}

/**
 * Reset demo to initial state
 */
function resetDemo() {
    currentStep = 0;
    
    // Hide all columns and arrows except column 1
    for (let i = 2; i <= 4; i++) {
        const col = document.getElementById(`stepCol${i}`);
        if (col) col.style.display = 'none';
        const arrow = document.getElementById(`arrow${i - 1}`);
        if (arrow) arrow.style.display = 'none';
    }
    
    // Update button
    updateProcessButton();
}

/**
 * Clear the order book
 */
function clearOrderBook() {
    orderBook.clear();
    demoOrders = [];
    currentStep = 0;
    
    // Hide all steps
    for (let i = 1; i <= 4; i++) {
        const container = document.getElementById(`ordersStep${i}`);
        if (container) container.innerHTML = '';
    }
    
    updateUI();
    console.log('Order book cleared');
}

/**
 * Cancel an order
 */
function cancelOrder(orderId) {
    const result = orderBook.cancelOrder(orderId);
    if (result) {
        updateUI();
        console.log(`Order ${orderId} cancelled`);
    }
}

/**
 * Update the entire UI
 */
function updateUI() {
    updateMarketData();
    updateOrderBookDisplay();
    updateTradesDisplay();
    updateOrdersDisplay();
    visualizer.drawDepthChart(orderBook);
}

/**
 * Update market data display
 */
function updateMarketData() {
    const bestBid = orderBook.getBestBid(true);
    const bestAsk = orderBook.getBestAsk(true);
    const spread = orderBook.getSpread(true);
    const midpoint = orderBook.getMidpoint(true);
    
    document.getElementById('bestBid').textContent = bestBid !== null ? bestBid.toFixed(2) : '-';
    document.getElementById('bestAsk').textContent = bestAsk !== null ? bestAsk.toFixed(2) : '-';
    document.getElementById('spread').textContent = spread !== null ? spread.toFixed(4) : '-';
    document.getElementById('midpoint').textContent = midpoint !== null ? midpoint.toFixed(4) : '-';
}

/**
 * Update order book display
 */
function updateOrderBookDisplay() {
    const bidDepth = orderBook.getDepth(Side.BUY, 10, false);
    const askDepth = orderBook.getDepth(Side.SELL, 10, false);
    
    // Calculate max quantity for depth bar scaling
    const allQuantities = [...bidDepth.map(d => d.quantity), ...askDepth.map(d => d.quantity)];
    const maxQty = Math.max(...allQuantities, 1);
    
    // Update asks (reversed to show best ask at bottom)
    const asksContainer = document.getElementById('asksContainer');
    asksContainer.innerHTML = '';
    
    const reversedAsks = [...askDepth].reverse();
    for (const level of reversedAsks) {
        const row = createBookRow(level, maxQty, 'ask');
        asksContainer.appendChild(row);
    }
    
    // Update bids
    const bidsContainer = document.getElementById('bidsContainer');
    bidsContainer.innerHTML = '';
    
    for (const level of bidDepth) {
        const row = createBookRow(level, maxQty, 'bid');
        bidsContainer.appendChild(row);
    }
}

/**
 * Create a book row element
 */
function createBookRow(level, maxQty, type) {
    const row = document.createElement('div');
    row.className = 'book-row';
    
    const depthPercent = (level.quantity / maxQty) * 100;
    
    row.innerHTML = `
        <div class="depth-bar" style="width: ${depthPercent}%"></div>
        <span class="price">${level.price.toFixed(2)}</span>
        <span>${level.quantity}</span>
        <span>${level.orderCount} order${level.orderCount !== 1 ? 's' : ''}</span>
    `;
    
    return row;
}

/**
 * Update trades display
 */
function updateTradesDisplay() {
    const tradesContainer = document.getElementById('tradesContainer');
    tradesContainer.innerHTML = '';
    
    // Show last 10 trades, most recent first
    const recentTrades = orderBook.trades.slice(-10).reverse();
    
    for (const trade of recentTrades) {
        const row = document.createElement('div');
        row.className = 'trades-row';
        row.innerHTML = `
            <span>${trade.tradeId}</span>
            <span class="side-buy">${trade.buyOrderId}</span>
            <span class="side-sell">${trade.sellOrderId}</span>
            <span>${trade.price.toFixed(2)}</span>
            <span>${trade.quantity}</span>
            <span>${formatTime(trade.timestamp)}</span>
        `;
        tradesContainer.appendChild(row);
    }
    
    if (recentTrades.length === 0) {
        tradesContainer.innerHTML = '<div class="trades-row" style="justify-content: center; grid-column: 1/-1;">No trades yet</div>';
    }
}

/**
 * Update orders display
 */
function updateOrdersDisplay() {
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = '';
    
    // Get all orders, sorted by timestamp (most recent first)
    const allOrders = orderBook.getAllOrders().sort((a, b) => b.timestamp - a.timestamp);
    
    for (const order of allOrders.slice(0, 20)) {
        const row = document.createElement('div');
        row.className = 'orders-row';
        
        const sideClass = order.side === Side.BUY ? 'side-buy' : 'side-sell';
        const statusClass = `status-${order.status.toLowerCase()}`;
        const visibleText = order.isVisible ? 'Yes' : 'No';
        
        const canCancel = order.status === OrderStatus.ACTIVE || order.status === OrderStatus.PARTIAL;
        const actionButton = canCancel 
            ? `<button class="btn btn-danger btn-small" onclick="cancelOrder('${order.orderId}')">Cancel</button>`
            : '-';
        
        row.innerHTML = `
            <span>${order.orderId}</span>
            <span class="${sideClass}">${order.side}</span>
            <span>${order.price.toFixed(2)}</span>
            <span>${order.quantity}</span>
            <span>${order.filledQuantity}</span>
            <span>${visibleText}</span>
            <span class="${statusClass}">${order.status}</span>
            <span>${actionButton}</span>
        `;
        ordersContainer.appendChild(row);
    }
    
    if (allOrders.length === 0) {
        ordersContainer.innerHTML = '<div class="orders-row" style="justify-content: center; grid-column: 1/-1;">No orders yet</div>';
    }
}

/**
 * Flash effect for new trades
 */
function flashTrades(trades) {
    // Could add visual flash effects here
    console.log(`Executed ${trades.length} trade(s)`);
}

/**
 * Format timestamp for display
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
