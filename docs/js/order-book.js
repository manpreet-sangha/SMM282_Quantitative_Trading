/**
 * Order Book Implementation in JavaScript
 * SMM282 Quantitative Trading
 * 
 * Implements Price-Visibility-Time Priority Matching
 */

// Enums
const Side = {
    BUY: 'BUY',
    SELL: 'SELL'
};

const OrderStatus = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    PARTIAL: 'PARTIAL',
    FILLED: 'FILLED',
    CANCELLED: 'CANCELLED'
};

/**
 * Represents a limit order
 */
class Order {
    constructor(orderId, side, price, quantity, isVisible = true) {
        this.orderId = orderId;
        this.side = side;
        this.price = parseFloat(price);
        this.quantity = parseInt(quantity);
        this.isVisible = isVisible;
        this.timestamp = new Date();
        this.filledQuantity = 0;
        this.status = OrderStatus.PENDING;
    }

    get remainingQuantity() {
        return this.quantity - this.filledQuantity;
    }

    /**
     * Compare orders for priority sorting
     * Priority: Price > Visibility > Time
     */
    compareTo(other) {
        if (this.side === Side.BUY) {
            // For buys: higher price first
            if (this.price !== other.price) {
                return other.price - this.price; // Descending
            }
        } else {
            // For sells: lower price first
            if (this.price !== other.price) {
                return this.price - other.price; // Ascending
            }
        }
        
        // Same price: visible first
        if (this.isVisible !== other.isVisible) {
            return this.isVisible ? -1 : 1;
        }
        
        // Same visibility: earlier time first
        return this.timestamp - other.timestamp;
    }
}

/**
 * Represents an executed trade
 */
class Trade {
    constructor(tradeId, buyOrderId, sellOrderId, price, quantity) {
        this.tradeId = tradeId;
        this.buyOrderId = buyOrderId;
        this.sellOrderId = sellOrderId;
        this.price = price;
        this.quantity = quantity;
        this.timestamp = new Date();
    }
}

/**
 * Limit Order Book with Price-Visibility-Time Priority Matching
 */
class OrderBook {
    constructor() {
        this.bids = []; // Buy orders sorted by priority
        this.asks = []; // Sell orders sorted by priority
        this.orders = new Map(); // All orders by ID
        this.trades = []; // Executed trades
        this._orderCounter = 0;
        this._tradeCounter = 0;
    }

    generateOrderId() {
        this._orderCounter++;
        return `O${String(this._orderCounter).padStart(4, '0')}`;
    }

    generateTradeId() {
        this._tradeCounter++;
        return `T${String(this._tradeCounter).padStart(4, '0')}`;
    }

    /**
     * Insert order into sorted list maintaining priority order
     */
    insertSorted(orderList, order) {
        let left = 0;
        let right = orderList.length;
        
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (order.compareTo(orderList[mid]) < 0) {
                right = mid;
            } else {
                left = mid + 1;
            }
        }
        
        orderList.splice(left, 0, order);
    }

    /**
     * Submit a new order to the order book
     */
    submitOrder(order) {
        order.status = OrderStatus.ACTIVE;
        this.orders.set(order.orderId, order);

        // Try to match the order
        const trades = this.matchOrder(order);

        // If order still has remaining quantity, add to book
        if (order.remainingQuantity > 0) {
            if (order.side === Side.BUY) {
                this.insertSorted(this.bids, order);
            } else {
                this.insertSorted(this.asks, order);
            }
        }

        return trades;
    }

    /**
     * Match incoming order against opposite side of the book
     */
    matchOrder(incomingOrder) {
        const trades = [];
        const oppositeSide = incomingOrder.side === Side.BUY ? this.asks : this.bids;

        while (incomingOrder.remainingQuantity > 0 && oppositeSide.length > 0) {
            const bestOpposite = oppositeSide[0];

            // Check if prices cross (can trade)
            if (incomingOrder.side === Side.BUY) {
                if (incomingOrder.price < bestOpposite.price) {
                    break; // No match possible
                }
            } else {
                if (incomingOrder.price > bestOpposite.price) {
                    break; // No match possible
                }
            }

            // Execute trade at the resting order's price
            const tradePrice = bestOpposite.price;
            const tradeQuantity = Math.min(
                incomingOrder.remainingQuantity,
                bestOpposite.remainingQuantity
            );

            // Update quantities
            incomingOrder.filledQuantity += tradeQuantity;
            bestOpposite.filledQuantity += tradeQuantity;

            // Update statuses
            incomingOrder.status = incomingOrder.remainingQuantity === 0 
                ? OrderStatus.FILLED 
                : OrderStatus.PARTIAL;

            if (bestOpposite.remainingQuantity === 0) {
                bestOpposite.status = OrderStatus.FILLED;
                oppositeSide.shift(); // Remove filled order
            } else {
                bestOpposite.status = OrderStatus.PARTIAL;
            }

            // Create trade record
            const [buyId, sellId] = incomingOrder.side === Side.BUY
                ? [incomingOrder.orderId, bestOpposite.orderId]
                : [bestOpposite.orderId, incomingOrder.orderId];

            const trade = new Trade(
                this.generateTradeId(),
                buyId,
                sellId,
                tradePrice,
                tradeQuantity
            );

            trades.push(trade);
            this.trades.push(trade);
        }

        return trades;
    }

    /**
     * Cancel an order
     */
    cancelOrder(orderId) {
        if (!this.orders.has(orderId)) {
            return false;
        }

        const order = this.orders.get(orderId);

        if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
            return false;
        }

        order.status = OrderStatus.CANCELLED;

        // Remove from appropriate side
        if (order.side === Side.BUY) {
            this.bids = this.bids.filter(o => o.orderId !== orderId);
        } else {
            this.asks = this.asks.filter(o => o.orderId !== orderId);
        }

        return true;
    }

    /**
     * Get best bid price
     */
    getBestBid(visibleOnly = true) {
        for (const order of this.bids) {
            if (!visibleOnly || order.isVisible) {
                return order.price;
            }
        }
        return null;
    }

    /**
     * Get best ask price
     */
    getBestAsk(visibleOnly = true) {
        for (const order of this.asks) {
            if (!visibleOnly || order.isVisible) {
                return order.price;
            }
        }
        return null;
    }

    /**
     * Get bid-ask spread
     */
    getSpread(visibleOnly = true) {
        const bestBid = this.getBestBid(visibleOnly);
        const bestAsk = this.getBestAsk(visibleOnly);

        if (bestBid !== null && bestAsk !== null) {
            return bestAsk - bestBid;
        }
        return null;
    }

    /**
     * Get midpoint price
     */
    getMidpoint(visibleOnly = true) {
        const bestBid = this.getBestBid(visibleOnly);
        const bestAsk = this.getBestAsk(visibleOnly);

        if (bestBid !== null && bestAsk !== null) {
            return (bestBid + bestAsk) / 2;
        }
        return null;
    }

    /**
     * Get aggregated depth at each price level
     */
    getDepth(side, levels = 10, visibleOnly = false) {
        const orders = side === Side.BUY ? this.bids : this.asks;
        const depth = new Map();

        for (const order of orders) {
            if (!visibleOnly || order.isVisible) {
                const current = depth.get(order.price) || { quantity: 0, orderCount: 0 };
                current.quantity += order.remainingQuantity;
                current.orderCount += 1;
                depth.set(order.price, current);
            }
        }

        // Convert to sorted array
        let sortedLevels = Array.from(depth.entries()).map(([price, data]) => ({
            price,
            quantity: data.quantity,
            orderCount: data.orderCount
        }));

        // Sort by price (descending for bids, ascending for asks)
        sortedLevels.sort((a, b) => side === Side.BUY ? b.price - a.price : a.price - b.price);

        return sortedLevels.slice(0, levels);
    }

    /**
     * Get all active orders
     */
    getActiveOrders() {
        return Array.from(this.orders.values()).filter(
            o => o.status === OrderStatus.ACTIVE || o.status === OrderStatus.PARTIAL
        );
    }

    /**
     * Get all orders
     */
    getAllOrders() {
        return Array.from(this.orders.values());
    }

    /**
     * Clear the order book
     */
    clear() {
        this.bids = [];
        this.asks = [];
        this.orders.clear();
        this.trades = [];
        this._orderCounter = 0;
        this._tradeCounter = 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OrderBook, Order, Trade, Side, OrderStatus };
}
