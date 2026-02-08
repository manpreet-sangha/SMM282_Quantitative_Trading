"""
Order Book Matching Engine with Price-Visibility-Time Priority

This module implements a limit order book that follows the standard matching rules:
1. Price Priority: More aggressive orders match first
   - Buys: Higher limit prices have priority
   - Sells: Lower limit prices have priority
2. Visibility Priority: Visible orders match before hidden orders at same price
3. Time Priority: Earlier orders match first (FIFO) at same price and visibility

Author: SMM282 Quantitative Trading
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Tuple
from collections import defaultdict
import heapq


class Side(Enum):
    """Order side - Buy or Sell"""
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(Enum):
    """Status of an order in the order book"""
    PENDING = "PENDING"      # Order submitted but not yet processed
    ACTIVE = "ACTIVE"        # Order is in the book, waiting for match
    PARTIAL = "PARTIAL"      # Order partially filled
    FILLED = "FILLED"        # Order completely filled
    CANCELLED = "CANCELLED"  # Order was cancelled


@dataclass
class Order:
    """
    Represents a limit order in the order book.
    
    Attributes:
        order_id: Unique identifier for the order
        side: BUY or SELL
        price: Limit price for the order
        quantity: Number of shares/units
        is_visible: Whether the order is displayed in the order book
        timestamp: When the order was submitted (auto-generated if not provided)
        filled_quantity: How much of the order has been filled
        status: Current status of the order
    """
    order_id: str
    side: Side
    price: float
    quantity: int
    is_visible: bool = True
    timestamp: datetime = field(default_factory=datetime.now)
    filled_quantity: int = 0
    status: OrderStatus = OrderStatus.PENDING
    
    @property
    def remaining_quantity(self) -> int:
        """Returns the unfilled quantity of the order"""
        return self.quantity - self.filled_quantity
    
    def __lt__(self, other: 'Order') -> bool:
        """
        Comparison for priority queue ordering.
        Priority: Price > Visibility > Time
        
        For BUY orders: Higher price = Higher priority (use negative for min-heap)
        For SELL orders: Lower price = Higher priority
        """
        if self.side == Side.BUY:
            # For buys: higher price first, then visible first, then earlier time first
            if self.price != other.price:
                return self.price > other.price  # Higher price = higher priority
            if self.is_visible != other.is_visible:
                return self.is_visible > other.is_visible  # Visible = higher priority
            return self.timestamp < other.timestamp  # Earlier = higher priority
        else:
            # For sells: lower price first, then visible first, then earlier time first
            if self.price != other.price:
                return self.price < other.price  # Lower price = higher priority
            if self.is_visible != other.is_visible:
                return self.is_visible > other.is_visible  # Visible = higher priority
            return self.timestamp < other.timestamp  # Earlier = higher priority
    
    def __repr__(self) -> str:
        visibility = "V" if self.is_visible else "H"
        return (f"Order({self.order_id}, {self.side.value}, "
                f"P={self.price:.2f}, Q={self.remaining_quantity}/{self.quantity}, "
                f"{visibility}, {self.status.value})")


@dataclass
class Trade:
    """
    Represents an executed trade between two orders.
    
    Attributes:
        trade_id: Unique identifier for the trade
        buy_order_id: ID of the buy order
        sell_order_id: ID of the sell order
        price: Execution price
        quantity: Number of shares/units traded
        timestamp: When the trade occurred
    """
    trade_id: str
    buy_order_id: str
    sell_order_id: str
    price: float
    quantity: int
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __repr__(self) -> str:
        return (f"Trade({self.trade_id}: {self.buy_order_id} x {self.sell_order_id}, "
                f"P={self.price:.2f}, Q={self.quantity})")


class OrderBook:
    """
    Limit Order Book with Price-Visibility-Time Priority Matching.
    
    The order book maintains separate lists for buy (bid) and sell (ask) orders,
    sorted by priority. When a new order arrives, it attempts to match against
    existing orders on the opposite side.
    
    Matching Priority (in order):
    1. Price: More aggressive prices match first
    2. Visibility: Visible orders match before hidden orders
    3. Time: Earlier orders match first (FIFO)
    """
    
    def __init__(self):
        """Initialize an empty order book"""
        self.bids: List[Order] = []  # Buy orders (sorted by priority)
        self.asks: List[Order] = []  # Sell orders (sorted by priority)
        self.orders: Dict[str, Order] = {}  # All orders by ID
        self.trades: List[Trade] = []  # Executed trades
        self._trade_counter = 0
        
    def _generate_trade_id(self) -> str:
        """Generate a unique trade ID"""
        self._trade_counter += 1
        return f"T{self._trade_counter:06d}"
    
    def submit_order(self, order: Order) -> List[Trade]:
        """
        Submit a new order to the order book.
        
        The order will first attempt to match against existing orders on the
        opposite side. Any remaining quantity is added to the book.
        
        Args:
            order: The order to submit
            
        Returns:
            List of trades that resulted from this order
        """
        order.status = OrderStatus.ACTIVE
        self.orders[order.order_id] = order
        
        # Try to match the order
        trades = self._match_order(order)
        
        # If order still has remaining quantity, add to book
        if order.remaining_quantity > 0:
            if order.side == Side.BUY:
                self._insert_sorted(self.bids, order)
            else:
                self._insert_sorted(self.asks, order)
        
        return trades
    
    def _insert_sorted(self, order_list: List[Order], order: Order) -> None:
        """Insert an order into the sorted list maintaining priority order"""
        # Use binary search to find insertion point
        left, right = 0, len(order_list)
        while left < right:
            mid = (left + right) // 2
            if order < order_list[mid]:
                right = mid
            else:
                left = mid + 1
        order_list.insert(left, order)
    
    def _match_order(self, incoming_order: Order) -> List[Trade]:
        """
        Attempt to match an incoming order against the opposite side of the book.
        
        Args:
            incoming_order: The new order to match
            
        Returns:
            List of trades executed
        """
        trades = []
        
        if incoming_order.side == Side.BUY:
            opposite_side = self.asks
        else:
            opposite_side = self.bids
        
        while incoming_order.remaining_quantity > 0 and opposite_side:
            best_opposite = opposite_side[0]
            
            # Check if prices cross (can trade)
            if incoming_order.side == Side.BUY:
                # Buy order matches if its price >= best ask price
                if incoming_order.price < best_opposite.price:
                    break  # No match possible
            else:
                # Sell order matches if its price <= best bid price
                if incoming_order.price > best_opposite.price:
                    break  # No match possible
            
            # Execute trade at the resting order's price (price-time priority)
            trade_price = best_opposite.price
            trade_quantity = min(incoming_order.remaining_quantity, 
                                best_opposite.remaining_quantity)
            
            # Update quantities
            incoming_order.filled_quantity += trade_quantity
            best_opposite.filled_quantity += trade_quantity
            
            # Update statuses
            if incoming_order.remaining_quantity == 0:
                incoming_order.status = OrderStatus.FILLED
            else:
                incoming_order.status = OrderStatus.PARTIAL
                
            if best_opposite.remaining_quantity == 0:
                best_opposite.status = OrderStatus.FILLED
                opposite_side.pop(0)  # Remove filled order from book
            else:
                best_opposite.status = OrderStatus.PARTIAL
            
            # Create trade record
            if incoming_order.side == Side.BUY:
                buy_id, sell_id = incoming_order.order_id, best_opposite.order_id
            else:
                buy_id, sell_id = best_opposite.order_id, incoming_order.order_id
                
            trade = Trade(
                trade_id=self._generate_trade_id(),
                buy_order_id=buy_id,
                sell_order_id=sell_id,
                price=trade_price,
                quantity=trade_quantity
            )
            trades.append(trade)
            self.trades.append(trade)
            
        return trades
    
    def cancel_order(self, order_id: str) -> bool:
        """
        Cancel an order in the order book.
        
        Args:
            order_id: ID of the order to cancel
            
        Returns:
            True if order was cancelled, False if not found or already filled
        """
        if order_id not in self.orders:
            return False
            
        order = self.orders[order_id]
        
        if order.status in [OrderStatus.FILLED, OrderStatus.CANCELLED]:
            return False
        
        order.status = OrderStatus.CANCELLED
        
        # Remove from appropriate side
        if order.side == Side.BUY:
            self.bids = [o for o in self.bids if o.order_id != order_id]
        else:
            self.asks = [o for o in self.asks if o.order_id != order_id]
            
        return True
    
    def get_best_bid(self, visible_only: bool = True) -> Optional[float]:
        """
        Get the best (highest) bid price.
        
        Args:
            visible_only: If True, only consider visible orders (market standard)
            
        Returns:
            Best bid price or None if no bids
        """
        for order in self.bids:
            if not visible_only or order.is_visible:
                return order.price
        return None
    
    def get_best_ask(self, visible_only: bool = True) -> Optional[float]:
        """
        Get the best (lowest) ask price.
        
        Args:
            visible_only: If True, only consider visible orders (market standard)
            
        Returns:
            Best ask price or None if no asks
        """
        for order in self.asks:
            if not visible_only or order.is_visible:
                return order.price
        return None
    
    def get_spread(self, visible_only: bool = True) -> Optional[float]:
        """
        Get the bid-ask spread.
        
        Args:
            visible_only: If True, only consider visible orders
            
        Returns:
            Spread (ask - bid) or None if no complete market
        """
        best_bid = self.get_best_bid(visible_only)
        best_ask = self.get_best_ask(visible_only)
        
        if best_bid is not None and best_ask is not None:
            return best_ask - best_bid
        return None
    
    def get_midpoint(self, visible_only: bool = True) -> Optional[float]:
        """
        Get the midpoint price.
        
        Args:
            visible_only: If True, only consider visible orders
            
        Returns:
            Midpoint price or None if no complete market
        """
        best_bid = self.get_best_bid(visible_only)
        best_ask = self.get_best_ask(visible_only)
        
        if best_bid is not None and best_ask is not None:
            return (best_bid + best_ask) / 2
        return None
    
    def get_depth(self, side: Side, levels: int = 5, visible_only: bool = False) -> List[Tuple[float, int]]:
        """
        Get order book depth (aggregated quantity at each price level).
        
        Args:
            side: BUY or SELL
            levels: Number of price levels to return
            visible_only: If True, only count visible orders
            
        Returns:
            List of (price, total_quantity) tuples
        """
        orders = self.bids if side == Side.BUY else self.asks
        
        depth: Dict[float, int] = defaultdict(int)
        for order in orders:
            if not visible_only or order.is_visible:
                depth[order.price] += order.remaining_quantity
        
        # Sort by priority (highest for bids, lowest for asks)
        sorted_levels = sorted(depth.items(), 
                              key=lambda x: x[0], 
                              reverse=(side == Side.BUY))
        
        return sorted_levels[:levels]
    
    def display(self, levels: int = 5, show_hidden: bool = True) -> str:
        """
        Display the order book in a readable format.
        
        Args:
            levels: Number of price levels to show on each side
            show_hidden: Whether to include hidden orders in the display
            
        Returns:
            String representation of the order book
        """
        lines = []
        lines.append("=" * 60)
        lines.append("ORDER BOOK")
        lines.append("=" * 60)
        
        # Market data (visible only)
        best_bid = self.get_best_bid(visible_only=True)
        best_ask = self.get_best_ask(visible_only=True)
        spread = self.get_spread(visible_only=True)
        midpoint = self.get_midpoint(visible_only=True)
        
        lines.append(f"Best Bid: {best_bid:.2f}" if best_bid else "Best Bid: None")
        lines.append(f"Best Ask: {best_ask:.2f}" if best_ask else "Best Ask: None")
        lines.append(f"Spread: {spread:.2f}" if spread else "Spread: None")
        lines.append(f"Midpoint: {midpoint:.2f}" if midpoint else "Midpoint: None")
        lines.append("-" * 60)
        
        # Ask side (reversed so best ask is at bottom)
        lines.append("ASKS (Sell Orders):")
        ask_depth = self.get_depth(Side.SELL, levels, visible_only=not show_hidden)
        for price, qty in reversed(ask_depth):
            lines.append(f"  {price:>10.2f}  |  {qty:>8}")
        
        lines.append("-" * 30 + " SPREAD " + "-" * 22)
        
        # Bid side
        lines.append("BIDS (Buy Orders):")
        bid_depth = self.get_depth(Side.BUY, levels, visible_only=not show_hidden)
        for price, qty in bid_depth:
            lines.append(f"  {price:>10.2f}  |  {qty:>8}")
        
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def get_order_queue_position(self, order_id: str) -> Optional[Tuple[int, int]]:
        """
        Get an order's position in the queue at its price level.
        
        Args:
            order_id: ID of the order
            
        Returns:
            Tuple of (position, total_at_level) or None if not found
        """
        if order_id not in self.orders:
            return None
            
        order = self.orders[order_id]
        
        if order.status in [OrderStatus.FILLED, OrderStatus.CANCELLED]:
            return None
        
        order_list = self.bids if order.side == Side.BUY else self.asks
        
        # Find orders at same price level
        same_price_orders = [o for o in order_list if o.price == order.price]
        
        for i, o in enumerate(same_price_orders):
            if o.order_id == order_id:
                return (i + 1, len(same_price_orders))
        
        return None


def demo():
    """Demonstrate the order book matching engine"""
    print("=" * 60)
    print("ORDER BOOK MATCHING ENGINE DEMO")
    print("Price-Visibility-Time Priority")
    print("=" * 60)
    print()
    
    book = OrderBook()
    
    # Submit some initial orders
    print("1. Submitting initial orders...")
    print()
    
    # Visible bid orders
    book.submit_order(Order("B1", Side.BUY, 99.00, 100, is_visible=True))
    book.submit_order(Order("B2", Side.BUY, 99.50, 150, is_visible=True))
    book.submit_order(Order("B3", Side.BUY, 99.50, 200, is_visible=True))  # Same price as B2, later time
    
    # Hidden bid order
    book.submit_order(Order("B4", Side.BUY, 99.50, 50, is_visible=False))  # Same price, hidden
    
    # Visible ask orders
    book.submit_order(Order("A1", Side.SELL, 100.50, 100, is_visible=True))
    book.submit_order(Order("A2", Side.SELL, 100.00, 150, is_visible=True))
    book.submit_order(Order("A3", Side.SELL, 100.00, 100, is_visible=True))  # Same price as A2
    
    # Hidden ask order
    book.submit_order(Order("A4", Side.SELL, 100.00, 75, is_visible=False))  # Same price, hidden
    
    print(book.display())
    print()
    
    # Show order priorities
    print("2. Order Priority at price level 99.50 (BUY side):")
    print("   Orders should be: B2 (visible, first) -> B3 (visible, second) -> B4 (hidden)")
    for order_id in ["B2", "B3", "B4"]:
        pos = book.get_order_queue_position(order_id)
        order = book.orders[order_id]
        print(f"   {order_id}: Position {pos[0]} of {pos[1]}, "
              f"Visible={order.is_visible}, Qty={order.remaining_quantity}")
    print()
    
    # Submit a market-crossing order
    print("3. Submitting aggressive sell order that crosses the spread...")
    print("   Order: SELL 200 @ 99.50 (will match against bids)")
    print()
    
    trades = book.submit_order(Order("A5", Side.SELL, 99.50, 200, is_visible=True))
    
    print(f"   Trades executed: {len(trades)}")
    for trade in trades:
        print(f"   {trade}")
    print()
    
    print(book.display())
    print()
    
    # Check the matching followed priority
    print("4. Verification of Priority Matching:")
    print("   B2 was matched first (visible, earliest)")
    print("   B3 was matched second (visible, but later than B2)")
    print("   B4 (hidden) was NOT matched - visible orders had priority")
    print()
    
    print("5. Order statuses after matching:")
    for order_id in ["B2", "B3", "B4"]:
        order = book.orders[order_id]
        print(f"   {order_id}: {order.status.value}, "
              f"Filled={order.filled_quantity}/{order.quantity}")


if __name__ == "__main__":
    demo()
