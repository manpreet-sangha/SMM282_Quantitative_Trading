"""
Tests for the Order Book Matching Engine

Tests verify that the Price-Visibility-Time priority rules are correctly implemented.
"""

import pytest
from datetime import datetime, timedelta

from simulations.order_book.matching_engine import (
    OrderBook, Order, Side, OrderStatus, Trade
)


class TestOrderCreation:
    """Test order creation and properties"""
    
    def test_create_order(self):
        """Test basic order creation"""
        order = Order(
            order_id="O1",
            side=Side.BUY,
            price=100.0,
            quantity=50
        )
        
        assert order.order_id == "O1"
        assert order.side == Side.BUY
        assert order.price == 100.0
        assert order.quantity == 50
        assert order.is_visible == True  # Default
        assert order.remaining_quantity == 50
        assert order.status == OrderStatus.PENDING
    
    def test_hidden_order(self):
        """Test hidden order creation"""
        order = Order("O1", Side.SELL, 100.0, 50, is_visible=False)
        assert order.is_visible == False
    
    def test_remaining_quantity(self):
        """Test remaining quantity calculation"""
        order = Order("O1", Side.BUY, 100.0, 100)
        order.filled_quantity = 40
        assert order.remaining_quantity == 60


class TestPricePriority:
    """Test that price priority is correctly enforced"""
    
    def test_buy_orders_higher_price_priority(self):
        """Higher priced buy orders should have priority"""
        book = OrderBook()
        
        # Submit buy orders at different prices
        book.submit_order(Order("B1", Side.BUY, 99.00, 100))
        book.submit_order(Order("B2", Side.BUY, 100.00, 100))  # Higher price
        book.submit_order(Order("B3", Side.BUY, 99.50, 100))
        
        # Best bid should be highest price
        assert book.get_best_bid() == 100.00
        
        # Submit a sell that matches - should match B2 first (highest bid)
        trades = book.submit_order(Order("S1", Side.SELL, 99.00, 100))
        
        assert len(trades) == 1
        assert trades[0].buy_order_id == "B2"  # Highest price matched first
        assert trades[0].price == 100.00  # Executed at resting order's price
    
    def test_sell_orders_lower_price_priority(self):
        """Lower priced sell orders should have priority"""
        book = OrderBook()
        
        # Submit sell orders at different prices
        book.submit_order(Order("S1", Side.SELL, 101.00, 100))
        book.submit_order(Order("S2", Side.SELL, 100.00, 100))  # Lower price
        book.submit_order(Order("S3", Side.SELL, 100.50, 100))
        
        # Best ask should be lowest price
        assert book.get_best_ask() == 100.00
        
        # Submit a buy that matches - should match S2 first (lowest ask)
        trades = book.submit_order(Order("B1", Side.BUY, 101.00, 100))
        
        assert len(trades) == 1
        assert trades[0].sell_order_id == "S2"
        assert trades[0].price == 100.00


class TestVisibilityPriority:
    """Test that visibility priority is correctly enforced at same price"""
    
    def test_visible_orders_priority_over_hidden(self):
        """Visible orders should match before hidden orders at same price"""
        book = OrderBook()
        
        # Submit hidden order first
        book.submit_order(Order("B1", Side.BUY, 100.00, 100, is_visible=False))
        # Submit visible order second
        book.submit_order(Order("B2", Side.BUY, 100.00, 100, is_visible=True))
        
        # Submit sell to match
        trades = book.submit_order(Order("S1", Side.SELL, 100.00, 100))
        
        # Visible order should match first despite being submitted later
        assert len(trades) == 1
        assert trades[0].buy_order_id == "B2"  # Visible order matched
    
    def test_hidden_order_matches_after_visible(self):
        """Hidden orders should match after all visible orders at same price"""
        book = OrderBook()
        
        book.submit_order(Order("B1", Side.BUY, 100.00, 50, is_visible=False))  # Hidden
        book.submit_order(Order("B2", Side.BUY, 100.00, 50, is_visible=True))   # Visible
        book.submit_order(Order("B3", Side.BUY, 100.00, 50, is_visible=True))   # Visible
        
        # Sell enough to match all
        trades = book.submit_order(Order("S1", Side.SELL, 100.00, 150))
        
        assert len(trades) == 3
        # Order of matching: B2 (visible, first), B3 (visible, second), B1 (hidden)
        assert trades[0].buy_order_id == "B2"
        assert trades[1].buy_order_id == "B3"
        assert trades[2].buy_order_id == "B1"


class TestTimePriority:
    """Test that time priority is correctly enforced at same price and visibility"""
    
    def test_earlier_orders_match_first(self):
        """Earlier submitted orders should match first (FIFO)"""
        book = OrderBook()
        
        # Create orders with explicit timestamps
        base_time = datetime.now()
        
        order1 = Order("B1", Side.BUY, 100.00, 100, is_visible=True)
        order1.timestamp = base_time
        
        order2 = Order("B2", Side.BUY, 100.00, 100, is_visible=True)
        order2.timestamp = base_time + timedelta(seconds=1)
        
        order3 = Order("B3", Side.BUY, 100.00, 100, is_visible=True)
        order3.timestamp = base_time + timedelta(seconds=2)
        
        book.submit_order(order2)  # Submit in non-chronological order
        book.submit_order(order1)
        book.submit_order(order3)
        
        # Submit sell to match first order
        trades = book.submit_order(Order("S1", Side.SELL, 100.00, 100))
        
        # B1 should match first (earliest timestamp)
        assert len(trades) == 1
        assert trades[0].buy_order_id == "B1"


class TestComplexPriority:
    """Test complex scenarios with multiple priority rules"""
    
    def test_price_beats_visibility(self):
        """Price priority should override visibility priority"""
        book = OrderBook()
        
        # Higher price but hidden
        book.submit_order(Order("B1", Side.BUY, 100.00, 100, is_visible=False))
        # Lower price but visible
        book.submit_order(Order("B2", Side.BUY, 99.00, 100, is_visible=True))
        
        trades = book.submit_order(Order("S1", Side.SELL, 99.00, 100))
        
        # B1 should match because price priority beats visibility
        assert len(trades) == 1
        assert trades[0].buy_order_id == "B1"
    
    def test_full_priority_chain(self):
        """Test complete priority chain: Price > Visibility > Time"""
        book = OrderBook()
        
        base_time = datetime.now()
        
        # Price 99.00 - should be matched last
        o1 = Order("B1", Side.BUY, 99.00, 10, is_visible=True)
        o1.timestamp = base_time
        
        # Price 100.00, hidden, early - should be matched third
        o2 = Order("B2", Side.BUY, 100.00, 10, is_visible=False)
        o2.timestamp = base_time
        
        # Price 100.00, visible, late - should be matched second
        o3 = Order("B3", Side.BUY, 100.00, 10, is_visible=True)
        o3.timestamp = base_time + timedelta(seconds=2)
        
        # Price 100.00, visible, early - should be matched first
        o4 = Order("B4", Side.BUY, 100.00, 10, is_visible=True)
        o4.timestamp = base_time + timedelta(seconds=1)
        
        for o in [o1, o2, o3, o4]:
            book.submit_order(o)
        
        # Match all orders
        trades = book.submit_order(Order("S1", Side.SELL, 99.00, 40))
        
        assert len(trades) == 4
        # Priority order: B4 (100, visible, earliest visible)
        #                 B3 (100, visible, later)
        #                 B2 (100, hidden)
        #                 B1 (99, visible)
        assert trades[0].buy_order_id == "B4"
        assert trades[1].buy_order_id == "B3"
        assert trades[2].buy_order_id == "B2"
        assert trades[3].buy_order_id == "B1"


class TestMarketData:
    """Test market data functions"""
    
    def test_spread_calculation(self):
        """Test bid-ask spread calculation"""
        book = OrderBook()
        
        book.submit_order(Order("B1", Side.BUY, 99.50, 100))
        book.submit_order(Order("S1", Side.SELL, 100.50, 100))
        
        assert book.get_best_bid() == 99.50
        assert book.get_best_ask() == 100.50
        assert book.get_spread() == 1.00
        assert book.get_midpoint() == 100.00
    
    def test_visible_only_market_data(self):
        """Market data should only reflect visible orders by default"""
        book = OrderBook()
        
        # Hidden order at best price
        book.submit_order(Order("B1", Side.BUY, 100.00, 100, is_visible=False))
        # Visible order at worse price
        book.submit_order(Order("B2", Side.BUY, 99.00, 100, is_visible=True))
        
        # Best bid should be 99.00 (visible only)
        assert book.get_best_bid(visible_only=True) == 99.00
        # But including hidden orders, it's 100.00
        assert book.get_best_bid(visible_only=False) == 100.00


class TestOrderCancellation:
    """Test order cancellation functionality"""
    
    def test_cancel_order(self):
        """Test basic order cancellation"""
        book = OrderBook()
        
        book.submit_order(Order("B1", Side.BUY, 100.00, 100))
        book.submit_order(Order("B2", Side.BUY, 99.00, 100))
        
        result = book.cancel_order("B1")
        
        assert result == True
        assert book.orders["B1"].status == OrderStatus.CANCELLED
        assert book.get_best_bid() == 99.00  # B1 removed, B2 is best
    
    def test_cancel_nonexistent_order(self):
        """Cancelling non-existent order should return False"""
        book = OrderBook()
        result = book.cancel_order("DOES_NOT_EXIST")
        assert result == False


class TestPartialFills:
    """Test partial fill scenarios"""
    
    def test_partial_fill(self):
        """Test that orders can be partially filled"""
        book = OrderBook()
        
        book.submit_order(Order("B1", Side.BUY, 100.00, 100))
        trades = book.submit_order(Order("S1", Side.SELL, 100.00, 30))
        
        assert len(trades) == 1
        assert trades[0].quantity == 30
        
        b1 = book.orders["B1"]
        assert b1.status == OrderStatus.PARTIAL
        assert b1.filled_quantity == 30
        assert b1.remaining_quantity == 70
        
        # Order should still be in book
        assert len(book.bids) == 1
    
    def test_multiple_fills(self):
        """Test order matching across multiple orders"""
        book = OrderBook()
        
        book.submit_order(Order("B1", Side.BUY, 100.00, 50))
        book.submit_order(Order("B2", Side.BUY, 100.00, 50))
        
        trades = book.submit_order(Order("S1", Side.SELL, 100.00, 75))
        
        assert len(trades) == 2
        assert trades[0].quantity == 50  # Fully fills B1
        assert trades[1].quantity == 25  # Partially fills B2
        
        assert book.orders["B1"].status == OrderStatus.FILLED
        assert book.orders["B2"].status == OrderStatus.PARTIAL


class TestQueuePosition:
    """Test queue position functionality"""
    
    def test_queue_position(self):
        """Test getting order's position in queue"""
        book = OrderBook()
        
        book.submit_order(Order("B1", Side.BUY, 100.00, 100, is_visible=True))
        book.submit_order(Order("B2", Side.BUY, 100.00, 100, is_visible=True))
        book.submit_order(Order("B3", Side.BUY, 100.00, 100, is_visible=False))
        
        pos1 = book.get_order_queue_position("B1")
        pos2 = book.get_order_queue_position("B2")
        pos3 = book.get_order_queue_position("B3")
        
        assert pos1 == (1, 3)  # First of 3
        assert pos2 == (2, 3)  # Second of 3
        assert pos3 == (3, 3)  # Third of 3 (hidden goes last)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
