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
    
    // Set up form handler
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    
    // Initial UI update
    updateUI();
    
    console.log('Order Book Simulator initialized');
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
    // These will be shown in arrival order first, then sorted step by step
    demoOrders = [
        { price: 32.01, visible: false, time: '10:00', trader: 5, arrivalOrder: 0 },
        { price: 34.05, visible: true,  time: '10:01', trader: 3, arrivalOrder: 1 },
        { price: 32.01, visible: true,  time: '10:02', trader: 2, arrivalOrder: 2 },
        { price: 33.05, visible: true,  time: '10:11', trader: 1, arrivalOrder: 3 },
        { price: 35.22, visible: true,  time: '10:13', trader: 6, arrivalOrder: 4 },
        { price: 35.33, visible: false, time: '10:21', trader: 4, arrivalOrder: 5 },
        { price: 33.05, visible: true,  time: '10:22', trader: 7, arrivalOrder: 6 },
    ];
    
    updateDemoDisplay();
    console.log('Sample orders loaded - Click "Process Limit Order Book" to see prioritisation');
}

/**
 * Process the next step of limit order book prioritisation
 */
function processLimitOrderBook() {
    if (demoOrders.length === 0) {
        alert('Please load sample orders first!');
        return;
    }
    
    currentStep++;
    if (currentStep > STEPS.TIME) {
        currentStep = STEPS.ARRIVAL;
    }
    
    updateDemoDisplay();
}

/**
 * Sort orders based on current step
 */
function getSortedOrders() {
    let sorted = [...demoOrders];
    
    switch (currentStep) {
        case STEPS.ARRIVAL:
            // Sort by arrival order
            sorted.sort((a, b) => a.arrivalOrder - b.arrivalOrder);
            break;
            
        case STEPS.PRICE:
            // Sort by price (highest first for buy orders)
            sorted.sort((a, b) => b.price - a.price);
            break;
            
        case STEPS.VISIBILITY:
            // Sort by price, then visibility (visible first)
            sorted.sort((a, b) => {
                if (a.price !== b.price) return b.price - a.price;
                if (a.visible !== b.visible) return a.visible ? -1 : 1;
                return 0;
            });
            break;
            
        case STEPS.TIME:
            // Sort by price, then visibility, then time
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
 * Update the demo display with animation
 */
function updateDemoDisplay() {
    const container = document.getElementById('demoOrdersContainer');
    if (!container) return;
    
    const sorted = getSortedOrders();
    const stepTitle = document.getElementById('stepTitle');
    const stepDescription = document.getElementById('stepDescription');
    
    if (stepTitle) {
        stepTitle.textContent = `(${currentStep + 1}) ${stepNames[currentStep]}`;
    }
    
    if (stepDescription) {
        const descriptions = [
            'Orders displayed in the sequence they arrived at the exchange.',
            'Orders sorted by limit price. Higher prices get priority for buy orders.',
            'At each price level, visible orders get priority over hidden orders.',
            'At same price and visibility, earlier orders get priority (FIFO).'
        ];
        stepDescription.textContent = descriptions[currentStep];
    }
    
    // Create new rows with animation
    container.innerHTML = '';
    
    sorted.forEach((order, index) => {
        const row = document.createElement('div');
        row.className = 'demo-order-row';
        row.style.animationDelay = `${index * 0.1}s`;
        
        // Highlight rows that demonstrate the current sorting principle
        let highlight = '';
        if (currentStep === STEPS.TIME && order.price === 33.05 && order.visible) {
            highlight = 'highlight-time';
        } else if (currentStep === STEPS.VISIBILITY && order.price === 32.01) {
            highlight = 'highlight-visibility';
        }
        
        row.innerHTML = `
            <span class="demo-price">${order.price.toFixed(2)}</span>
            <span class="demo-visibility ${order.visible ? 'visible' : 'hidden'}">${order.visible ? 'Visible' : 'Hidden'}</span>
            <span class="demo-time">${order.time}</span>
            <span class="demo-trader">${order.trader}</span>
        `;
        
        if (highlight) {
            row.classList.add(highlight);
        }
        
        container.appendChild(row);
    });
}

/**
 * Reset demo to initial state
 */
function resetDemo() {
    currentStep = 0;
    if (demoOrders.length > 0) {
        updateDemoDisplay();
    }
}

/**
 * Clear the order book
 */
function clearOrderBook() {
    orderBook.clear();
    demoOrders = [];
    currentStep = 0;
    
    const container = document.getElementById('demoOrdersContainer');
    if (container) {
        container.innerHTML = '<div class="demo-empty">Click "Load Sample Orders" to begin</div>';
    }
    
    const stepTitle = document.getElementById('stepTitle');
    if (stepTitle) {
        stepTitle.textContent = 'Limit Order Processing Demo';
    }
    
    const stepDescription = document.getElementById('stepDescription');
    if (stepDescription) {
        stepDescription.textContent = 'Load sample orders to see how buy orders are prioritised.';
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
