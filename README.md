# SMM282 Quantitative Trading Simulations

A collection of simulations and implementations covering key concepts from the Quantitative Trading module.

## 🌐 Live Demo

**[View the Order Book Simulator](https://manpreet-sangha.github.io/SMM282_Quantitative_Trading/)**

Interactive web-based visualization of the limit order book matching engine.

## Project Structure

```
SMM282_Quantitative_Trading/
├── Exercises/
│   └── session 4/            # CAPM & Fama-MacBeth exercises
│       ├── solveCAPMExercise.py
│       ├── solveFamaMacBethExercise.py
│       ├── stockReturns.xlsx
│       ├── uk_data.xlsx
│       └── charts/           # Auto-generated visualizations
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

## Exercises

### Session 4: Asset Pricing Models

#### CAPM Exercise (`solveCAPMExercise.py`)

Implements the **Capital Asset Pricing Model (CAPM)** for 4 UK stocks (Tesco, Barclays, Vodafone, British Land) using OLS regression.

**What it computes:**
- **Beta (β)** — each stock's sensitivity to market movements
- **Systematic Risk** — market-driven risk (β × σ_market), cannot be diversified away
- **Specific Risk** — company-specific risk (std dev of regression residuals), can be diversified away

**Visualizations** (saved to `charts/capm_summary.png`):
- Beta comparison bar chart (red = β > 1, blue = β < 1)
- Stacked risk decomposition (systematic vs specific)
- Beta vs Total Risk scatter plot

#### Fama-MacBeth Exercise (`solveFamaMacBethExercise.py`)

Implements the **Fama-MacBeth two-pass regression** procedure to test whether the market rewards beta risk with higher returns.

**How it works:**
1. At each time period, runs a **cross-sectional regression** of stock returns on their previous-period betas
2. Extracts the slope coefficient **γ₁** (the market risk premium) for each period
3. Tests whether the average γ₁ is statistically significant using a **t-statistic**

**Interpretation:**
- **Positive mean γ₁** → stocks with higher betas earned higher returns on average
- **|t-stat| > 2** → the risk premium is statistically significant at the 5% level
- **T-stat bar turns red** if significant, gray if not

**Visualizations** (saved to `charts/fama_macbeth_summary.png`):
- Factor returns (γ₁) over time — shows stability of the risk premium
- Mean factor return & t-statistic summary

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
