/**
 * Main Application
 * SMM282 Quantitative Trading - Order Book Simulator
 */

// Global instances
let orderBook;
let visualizer;

// Demo state for step-by-step processing - separate for buy and sell
let buyDemoOrders = [];
let sellDemoOrders = [];
let buyCurrentStep = 0;
let sellCurrentStep = 0;

const STEPS = {
    ARRIVAL: 0,
    PRICE: 1,
    VISIBILITY: 2,
    TIME: 3
};
let stepNames = ['Orders by Arrival Time', 'Prioritisation by Price', 'Prioritisation by Price, Visibility', 'Prioritisation by Price, Visibility, Time'];

// Sample Buy Orders (from lecture)
const BUY_ORDERS = [
    { price: 32.01, visible: false, time: '10:00', trader: 5, arrivalOrder: 0 },
    { price: 34.05, visible: true,  time: '10:01', trader: 3, arrivalOrder: 1 },
    { price: 32.01, visible: true,  time: '10:02', trader: 2, arrivalOrder: 2 },
    { price: 33.05, visible: true,  time: '10:11', trader: 1, arrivalOrder: 3 },
    { price: 35.22, visible: true,  time: '10:13', trader: 6, arrivalOrder: 4 },
    { price: 35.33, visible: false, time: '10:21', trader: 4, arrivalOrder: 5 },
    { price: 33.05, visible: true,  time: '10:22', trader: 7, arrivalOrder: 6 },
];

// Sample Sell Orders (from lecture slide)
const SELL_ORDERS = [
    { price: 38.56, visible: true,  time: '10:02', trader: 10, arrivalOrder: 0 },
    { price: 36.19, visible: false, time: '10:05', trader: 12, arrivalOrder: 1 },
    { price: 36.93, visible: true,  time: '10:11', trader: 9,  arrivalOrder: 2 },
    { price: 36.93, visible: true,  time: '10:13', trader: 8,  arrivalOrder: 3 },
    { price: 40.02, visible: true,  time: '10:14', trader: 13, arrivalOrder: 4 },
    { price: 37.66, visible: false, time: '10:20', trader: 11, arrivalOrder: 5 },
    { price: 37.66, visible: true,  time: '10:21', trader: 14, arrivalOrder: 6 },
];

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
        loadAllSampleOrders();
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
    buyDemoOrders = [];
    sellDemoOrders = [];
    buyCurrentStep = 0;
    sellCurrentStep = 0;
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
 * Load all sample orders (both buy and sell sections)
 */
function loadAllSampleOrders() {
    loadBuySampleOrders();
    loadSellSampleOrders();
    console.log('Both Buy and Sell orders loaded - Click buttons to see prioritisation steps');
}

/**
 * Load sample buy orders
 */
function loadBuySampleOrders() {
    buyCurrentStep = 0;
    buyDemoOrders = [...BUY_ORDERS];
    
    // Hide all columns and arrows except column 1 (for buy section)
    for (let i = 2; i <= 4; i++) {
        const col = document.getElementById(`buyStepCol${i}`);
        if (col) col.style.display = 'none';
        const arrow = document.getElementById(`buyArrow${i - 1}`);
        if (arrow) arrow.style.display = 'none';
    }
    
    // Populate step 1 with arrival order
    populateBuyStepOrders(1, getSortedOrdersForStep(0, 'buy'));
    
    // Update button
    updateBuyProcessButton();
}

/**
 * Load sample sell orders
 */
function loadSellSampleOrders() {
    sellCurrentStep = 0;
    sellDemoOrders = [...SELL_ORDERS];
    
    // Hide all columns and arrows except column 1 (for sell section)
    for (let i = 2; i <= 4; i++) {
        const col = document.getElementById(`sellStepCol${i}`);
        if (col) col.style.display = 'none';
        const arrow = document.getElementById(`sellArrow${i - 1}`);
        if (arrow) arrow.style.display = 'none';
    }
    
    // Populate step 1 with arrival order
    populateSellStepOrders(1, getSortedOrdersForStep(0, 'sell'));
    
    // Update button
    updateSellProcessButton();
}

/**
 * Get sorted orders for a specific step
 * Buy orders: higher prices get priority
 * Sell orders: lower prices get priority
 */
function getSortedOrdersForStep(step, orderType) {
    const isBuy = orderType === 'buy';
    let sorted = isBuy ? [...buyDemoOrders] : [...sellDemoOrders];
    
    switch (step) {
        case STEPS.ARRIVAL:
            sorted.sort((a, b) => a.arrivalOrder - b.arrivalOrder);
            break;
            
        case STEPS.PRICE:
            // Buy: higher price first, Sell: lower price first
            sorted.sort((a, b) => isBuy ? b.price - a.price : a.price - b.price);
            break;
            
        case STEPS.VISIBILITY:
            sorted.sort((a, b) => {
                // Price priority
                const priceCompare = isBuy ? b.price - a.price : a.price - b.price;
                if (a.price !== b.price) return priceCompare;
                // Visibility priority (visible first)
                if (a.visible !== b.visible) return a.visible ? -1 : 1;
                return 0;
            });
            break;
            
        case STEPS.TIME:
            sorted.sort((a, b) => {
                // Price priority
                const priceCompare = isBuy ? b.price - a.price : a.price - b.price;
                if (a.price !== b.price) return priceCompare;
                // Visibility priority
                if (a.visible !== b.visible) return a.visible ? -1 : 1;
                // Time priority (earlier first)
                return a.time.localeCompare(b.time);
            });
            break;
    }
    
    return sorted;
}

/**
 * Populate orders for buy section step container with movement indicators
 */
function populateBuyStepOrders(stepNum, orders, prevOrders = null) {
    const container = document.getElementById(`buyOrdersStep${stepNum}`);
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
        
        const visDisplay = order.visible ? 'V' : 'H';
        const visClass = order.visible ? 'vis-visible' : 'vis-hidden';
        
        // Calculate movement for steps 2-4
        let movementHtml = '';
        if (showMovement) {
            const prevPos = prevPositions[order.trader];
            const movement = prevPos - index;
            
            if (movement > 0) {
                movementHtml = `<span class="move-indicator move-up">↑${movement}</span>`;
            } else if (movement < 0) {
                movementHtml = `<span class="move-indicator move-down">↓${Math.abs(movement)}</span>`;
            } else {
                movementHtml = `<span class="move-indicator move-same">−</span>`;
            }
        }
        
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
 * Populate orders for sell section step container with movement indicators
 */
function populateSellStepOrders(stepNum, orders, prevOrders = null) {
    const container = document.getElementById(`sellOrdersStep${stepNum}`);
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
        row.className = 'compact-row sell-row';
        row.style.animationDelay = `${index * 0.04}s`;
        
        const visDisplay = order.visible ? 'V' : 'H';
        const visClass = order.visible ? 'vis-visible' : 'vis-hidden';
        
        // Calculate movement for steps 2-4
        let movementHtml = '';
        if (showMovement) {
            const prevPos = prevPositions[order.trader];
            const movement = prevPos - index;
            
            if (movement > 0) {
                movementHtml = `<span class="move-indicator move-up">↑${movement}</span>`;
            } else if (movement < 0) {
                movementHtml = `<span class="move-indicator move-down">↓${Math.abs(movement)}</span>`;
            } else {
                movementHtml = `<span class="move-indicator move-same">−</span>`;
            }
        }
        
        row.innerHTML = `
            <span class="cell-price sell-price">${order.price.toFixed(2)}</span>
            <span class="cell-vis ${visClass}">${visDisplay}</span>
            <span class="cell-time">${order.time}</span>
            <span class="cell-trader sell-trader">${order.trader}</span>
            ${movementHtml}
        `;
        
        container.appendChild(row);
    });
}

/**
 * Update the buy process button text based on current step
 */
function updateBuyProcessButton() {
    const processBtn = document.getElementById('buyProcessBtn');
    if (!processBtn) return;
    
    const buttonTexts = [
        '▶ Apply Price Priority',
        '▶ Apply Visibility Priority',
        '▶ Apply Time Priority (FIFO)',
        '↺ Start Over'
    ];
    
    processBtn.textContent = buttonTexts[buyCurrentStep];
}

/**
 * Update the sell process button text based on current step
 */
function updateSellProcessButton() {
    const processBtn = document.getElementById('sellProcessBtn');
    if (!processBtn) return;
    
    const buttonTexts = [
        '▶ Apply Price Priority',
        '▶ Apply Visibility Priority',
        '▶ Apply Time Priority (FIFO)',
        '↺ Start Over'
    ];
    
    processBtn.textContent = buttonTexts[sellCurrentStep];
}

/**
 * Process the next step of buy limit order book prioritisation
 */
function processBuyLimitOrderBook() {
    if (buyDemoOrders.length === 0) {
        loadBuySampleOrders();
        return;
    }
    
    // If we're at the last step, reset
    if (buyCurrentStep >= STEPS.TIME) {
        resetBuyDemo();
        return;
    }
    
    // Get previous step's order for comparison
    const prevOrders = getSortedOrdersForStep(buyCurrentStep, 'buy');
    
    // Move to next step
    buyCurrentStep++;
    
    // Show the arrow before the new column
    const arrow = document.getElementById(`buyArrow${buyCurrentStep}`);
    if (arrow) arrow.style.display = 'flex';
    
    // Show the new column
    const stepCol = document.getElementById(`buyStepCol${buyCurrentStep + 1}`);
    if (stepCol) {
        stepCol.style.display = 'block';
        populateBuyStepOrders(buyCurrentStep + 1, getSortedOrdersForStep(buyCurrentStep, 'buy'), prevOrders);
    }
    
    updateBuyProcessButton();
}

/**
 * Process the next step of sell limit order book prioritisation
 */
function processSellLimitOrderBook() {
    if (sellDemoOrders.length === 0) {
        loadSellSampleOrders();
        return;
    }
    
    // If we're at the last step, reset
    if (sellCurrentStep >= STEPS.TIME) {
        resetSellDemo();
        return;
    }
    
    // Get previous step's order for comparison
    const prevOrders = getSortedOrdersForStep(sellCurrentStep, 'sell');
    
    // Move to next step
    sellCurrentStep++;
    
    // Show the arrow before the new column
    const arrow = document.getElementById(`sellArrow${sellCurrentStep}`);
    if (arrow) arrow.style.display = 'flex';
    
    // Show the new column
    const stepCol = document.getElementById(`sellStepCol${sellCurrentStep + 1}`);
    if (stepCol) {
        stepCol.style.display = 'block';
        populateSellStepOrders(sellCurrentStep + 1, getSortedOrdersForStep(sellCurrentStep, 'sell'), prevOrders);
    }
    
    updateSellProcessButton();
}

/**
 * Reset buy demo to initial state
 */
function resetBuyDemo() {
    buyCurrentStep = 0;
    
    for (let i = 2; i <= 4; i++) {
        const col = document.getElementById(`buyStepCol${i}`);
        if (col) col.style.display = 'none';
        const arrow = document.getElementById(`buyArrow${i - 1}`);
        if (arrow) arrow.style.display = 'none';
    }
    
    updateBuyProcessButton();
}

/**
 * Reset sell demo to initial state
 */
function resetSellDemo() {
    sellCurrentStep = 0;
    
    for (let i = 2; i <= 4; i++) {
        const col = document.getElementById(`sellStepCol${i}`);
        if (col) col.style.display = 'none';
        const arrow = document.getElementById(`sellArrow${i - 1}`);
        if (arrow) arrow.style.display = 'none';
    }
    
    updateSellProcessButton();
}

/**
 * Clear the order book
 */
function clearOrderBook() {
    orderBook.clear();
    buyDemoOrders = [];
    sellDemoOrders = [];
    buyCurrentStep = 0;
    sellCurrentStep = 0;
    
    // Hide all steps for buy section
    for (let i = 1; i <= 4; i++) {
        const buyContainer = document.getElementById(`buyOrdersStep${i}`);
        if (buyContainer) buyContainer.innerHTML = '';
        const sellContainer = document.getElementById(`sellOrdersStep${i}`);
        if (sellContainer) sellContainer.innerHTML = '';
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
