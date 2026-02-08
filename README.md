# SMM282 Quantitative Trading Simulations

A collection of simulations and implementations covering key concepts from the Quantitative Trading module.

## 🌐 Live Demo

**[View the Order Book Simulator](https://manpreet-sangha.github.io/SMM282_Quantitative_Trading/)**

Interactive web-based visualization of the limit order book matching engine.

## Project Structure

```
SMM282_Quantitative_Trading/
├── simulations/
│   ├── order_book/           # Order book and matching engine simulations (Python)
│   └── ...
├── tests/                    # Unit tests
└── docs/                     # Web visualization (GitHub Pages)
    ├── index.html            # Main web interface
    ├── css/                  # Styles
    └── js/                   # JavaScript implementation
```

## Simulations

### 1. Order Book Matching Engine (Price-Visibility-Time Priority)

Simulates a limit order book with the following priority rules:

1. **Price First**: More aggressive orders get priority
   - Buy orders: Higher limit prices have priority
   - Sell orders: Lower limit prices have priority

2. **Visibility**: For orders with the same limit price
   - Visible orders get priority over hidden orders
   - Market quotes and bid/ask spreads only reflect visible orders

3. **Time**: For orders with same price and visibility
   - Earlier submitted orders get priority (FIFO)

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```python
from simulations.order_book.matching_engine import OrderBook, Order, Side

# Create an order book
order_book = OrderBook()

# Submit orders
order_book.submit_order(Order(
    order_id="1",
    side=Side.BUY,
    price=100.0,
    quantity=10,
    is_visible=True
))

# View the order book
order_book.display()
```

## Running Tests

```bash
pytest tests/
```

## Deploying the Web Visualization

The web visualization is hosted via GitHub Pages from the `/docs` folder.

To enable GitHub Pages:
1. Go to your repository Settings
2. Navigate to Pages
3. Under "Source", select "Deploy from a branch"
4. Select `main` branch and `/docs` folder
5. Save

The site will be available at: `https://manpreet-sangha.github.io/SMM282_Quantitative_Trading/`

## License

Educational use for SMM282 Quantitative Trading module.
