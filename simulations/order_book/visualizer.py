"""
Order Book Visualizer

Provides text-based and future graphical visualization of the order book state.
"""

from typing import Optional
from .matching_engine import OrderBook, Order, Side, OrderStatus


class OrderBookVisualizer:
    """
    Visualizer for the order book state.
    
    Provides various views of the order book including:
    - Level 1 (best bid/ask)
    - Level 2 (price levels with aggregated depth)
    - Level 3 (individual orders)
    """
    
    def __init__(self, order_book: OrderBook):
        """
        Initialize the visualizer with an order book.
        
        Args:
            order_book: The order book to visualize
        """
        self.order_book = order_book
    
    def level1(self) -> str:
        """
        Display Level 1 market data (best bid/ask only).
        Shows what most market participants see.
        
        Returns:
            String representation of Level 1 data
        """
        best_bid = self.order_book.get_best_bid(visible_only=True)
        best_ask = self.order_book.get_best_ask(visible_only=True)
        spread = self.order_book.get_spread(visible_only=True)
        midpoint = self.order_book.get_midpoint(visible_only=True)
        
        # Get quantities at best prices
        bid_depth = self.order_book.get_depth(Side.BUY, 1, visible_only=True)
        ask_depth = self.order_book.get_depth(Side.SELL, 1, visible_only=True)
        
        bid_qty = bid_depth[0][1] if bid_depth else 0
        ask_qty = ask_depth[0][1] if ask_depth else 0
        
        lines = [
            "┌─────────────────────────────────────────┐",
            "│           LEVEL 1 MARKET DATA           │",
            "├─────────────────────────────────────────┤",
        ]
        
        if best_bid is not None and best_ask is not None:
            lines.extend([
                f"│  Best Bid:  {best_bid:>8.2f}  x  {bid_qty:<8}   │",
                f"│  Best Ask:  {best_ask:>8.2f}  x  {ask_qty:<8}   │",
                "├─────────────────────────────────────────┤",
                f"│  Spread:    {spread:>8.4f}                  │",
                f"│  Midpoint:  {midpoint:>8.4f}                  │",
            ])
        else:
            lines.append("│         No complete market              │")
        
        lines.append("└─────────────────────────────────────────┘")
        
        return "\n".join(lines)
    
    def level2(self, levels: int = 5, show_hidden: bool = False) -> str:
        """
        Display Level 2 market data (aggregated depth at each price level).
        
        Args:
            levels: Number of price levels to show
            show_hidden: Include hidden orders in aggregation
            
        Returns:
            String representation of Level 2 data
        """
        ask_depth = self.order_book.get_depth(Side.SELL, levels, visible_only=not show_hidden)
        bid_depth = self.order_book.get_depth(Side.BUY, levels, visible_only=not show_hidden)
        
        lines = [
            "┌─────────────────────────────────────────────────────────┐",
            "│                  LEVEL 2 MARKET DEPTH                   │",
            "├───────────────────────┬─────────────────────────────────┤",
            "│    PRICE    │  SIZE   │         VISUAL DEPTH            │",
            "├─────────────┼─────────┼─────────────────────────────────┤",
        ]
        
        # Calculate max quantity for scaling
        all_quantities = [q for _, q in ask_depth + bid_depth]
        max_qty = max(all_quantities) if all_quantities else 1
        
        # ASK side (reversed for display)
        lines.append("│           ASKS (Sell Orders)                            │")
        for price, qty in reversed(ask_depth):
            bar_len = int(20 * qty / max_qty)
            bar = "█" * bar_len
            lines.append(f"│  {price:>9.2f}  │  {qty:>5}  │  {bar:<20}       │")
        
        lines.append("├─────────────┴─────────┴─────────────────────────────────┤")
        lines.append("│                      ─── SPREAD ───                     │")
        lines.append("├─────────────┬─────────┬─────────────────────────────────┤")
        
        # BID side
        lines.append("│           BIDS (Buy Orders)                             │")
        for price, qty in bid_depth:
            bar_len = int(20 * qty / max_qty)
            bar = "█" * bar_len
            lines.append(f"│  {price:>9.2f}  │  {qty:>5}  │  {bar:<20}       │")
        
        lines.append("└─────────────┴─────────┴─────────────────────────────────┘")
        
        return "\n".join(lines)
    
    def level3(self, levels: int = 3) -> str:
        """
        Display Level 3 market data (individual orders).
        Shows detailed order-by-order information including visibility.
        
        Args:
            levels: Number of price levels to show
            
        Returns:
            String representation of Level 3 data
        """
        lines = [
            "┌───────────────────────────────────────────────────────────────────┐",
            "│                    LEVEL 3 ORDER BOOK                             │",
            "│  (V = Visible, H = Hidden)                                        │",
            "├───────────────────────────────────────────────────────────────────┤",
        ]
        
        # Group orders by price
        ask_orders = {}
        for order in self.order_book.asks[:20]:  # Limit display
            if order.price not in ask_orders:
                ask_orders[order.price] = []
            ask_orders[order.price].append(order)
        
        bid_orders = {}
        for order in self.order_book.bids[:20]:
            if order.price not in bid_orders:
                bid_orders[order.price] = []
            bid_orders[order.price].append(order)
        
        lines.append("│  ASKS (Sell Orders) - Priority: Lowest Price First           │")
        lines.append("├───────────────────────────────────────────────────────────────┤")
        
        sorted_ask_prices = sorted(ask_orders.keys(), reverse=True)[:levels]
        for price in reversed(sorted_ask_prices):
            lines.append(f"│  Price: {price:.2f}")
            for i, order in enumerate(ask_orders[price]):
                vis = "V" if order.is_visible else "H"
                priority = i + 1
                lines.append(f"│    [{priority}] {order.order_id}: {order.remaining_quantity} units ({vis})")
        
        lines.append("├───────────────────────────────────────────────────────────────┤")
        lines.append("│                         ─── SPREAD ───                        │")
        lines.append("├───────────────────────────────────────────────────────────────┤")
        
        lines.append("│  BIDS (Buy Orders) - Priority: Highest Price First            │")
        lines.append("├───────────────────────────────────────────────────────────────┤")
        
        sorted_bid_prices = sorted(bid_orders.keys(), reverse=True)[:levels]
        for price in sorted_bid_prices:
            lines.append(f"│  Price: {price:.2f}")
            for i, order in enumerate(bid_orders[price]):
                vis = "V" if order.is_visible else "H"
                priority = i + 1
                lines.append(f"│    [{priority}] {order.order_id}: {order.remaining_quantity} units ({vis})")
        
        lines.append("└───────────────────────────────────────────────────────────────┘")
        
        return "\n".join(lines)
    
    def trade_history(self, last_n: int = 10) -> str:
        """
        Display recent trade history.
        
        Args:
            last_n: Number of recent trades to show
            
        Returns:
            String representation of trade history
        """
        trades = self.order_book.trades[-last_n:]
        
        lines = [
            "┌─────────────────────────────────────────────────────────┐",
            "│                    TRADE HISTORY                        │",
            "├─────────┬─────────────────────┬──────────┬───────────────┤",
            "│  Trade  │  Buy x Sell         │  Price   │    Quantity   │",
            "├─────────┼─────────────────────┼──────────┼───────────────┤",
        ]
        
        for trade in reversed(trades):
            lines.append(
                f"│ {trade.trade_id:>7} │ {trade.buy_order_id:>8} x {trade.sell_order_id:<8} │ "
                f"{trade.price:>8.2f} │ {trade.quantity:>13} │"
            )
        
        if not trades:
            lines.append("│                  No trades yet                          │")
        
        lines.append("└─────────┴─────────────────────┴──────────┴───────────────┘")
        
        return "\n".join(lines)
    
    def full_display(self) -> str:
        """
        Display complete order book visualization.
        
        Returns:
            Complete visualization string
        """
        parts = [
            self.level1(),
            "",
            self.level2(),
            "",
            self.level3(),
            "",
            self.trade_history()
        ]
        return "\n".join(parts)


def demo():
    """Demo the visualizer"""
    from .matching_engine import OrderBook, Order, Side
    
    book = OrderBook()
    
    # Add some orders
    book.submit_order(Order("B1", Side.BUY, 99.00, 100))
    book.submit_order(Order("B2", Side.BUY, 99.50, 150))
    book.submit_order(Order("B3", Side.BUY, 99.50, 200))
    book.submit_order(Order("B4", Side.BUY, 99.50, 50, is_visible=False))
    book.submit_order(Order("B5", Side.BUY, 98.50, 300))
    
    book.submit_order(Order("A1", Side.SELL, 100.50, 100))
    book.submit_order(Order("A2", Side.SELL, 100.00, 150))
    book.submit_order(Order("A3", Side.SELL, 100.00, 100))
    book.submit_order(Order("A4", Side.SELL, 100.00, 75, is_visible=False))
    book.submit_order(Order("A5", Side.SELL, 101.00, 200))
    
    # Execute a trade
    book.submit_order(Order("A6", Side.SELL, 99.50, 100))
    
    viz = OrderBookVisualizer(book)
    print(viz.full_display())


if __name__ == "__main__":
    demo()
