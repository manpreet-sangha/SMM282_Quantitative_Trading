/**
 * Main Application
 * SMM282 Quantitative Trading - Order Book Simulator
 */

// Global instances
let orderBook;
let visualizer;

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
    
    // Sample bid orders at different prices
    const sampleBids = [
        { price: 99.00, qty: 100, visible: true },
        { price: 99.25, qty: 150, visible: true },
        { price: 99.50, qty: 200, visible: true },
        { price: 99.50, qty: 100, visible: true },  // Same price, time priority
        { price: 99.50, qty: 75, visible: false },  // Hidden order
        { price: 99.75, qty: 180, visible: true },
        { price: 98.50, qty: 250, visible: true },
    ];
    
    // Sample ask orders at different prices
    const sampleAsks = [
        { price: 100.25, qty: 120, visible: true },
        { price: 100.50, qty: 150, visible: true },
        { price: 100.50, qty: 80, visible: true },
        { price: 100.50, qty: 50, visible: false }, // Hidden order
        { price: 100.75, qty: 200, visible: true },
        { price: 101.00, qty: 175, visible: true },
        { price: 101.50, qty: 300, visible: true },
    ];
    
    // Submit bids
    for (const bid of sampleBids) {
        const order = new Order(
            orderBook.generateOrderId(),
            Side.BUY,
            bid.price,
            bid.qty,
            bid.visible
        );
        orderBook.submitOrder(order);
    }
    
    // Submit asks
    for (const ask of sampleAsks) {
        const order = new Order(
            orderBook.generateOrderId(),
            Side.SELL,
            ask.price,
            ask.qty,
            ask.visible
        );
        orderBook.submitOrder(order);
    }
    
    updateUI();
    console.log('Sample orders loaded');
}

/**
 * Clear the order book
 */
function clearOrderBook() {
    orderBook.clear();
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
