# solveCAPMExercise.py

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

def computeCAPMStats(r, rIdx):

    # This function computes CAPM betas ("beta"), estimated systematic (i.e. market)
    # risk ("sysRisk") and company-specific risk ("specRisk")
    #
    # INPUTS: r    = TxN array of stock returns (in columns; T = number of periods, N = number of stocks)
    #         rIdx = Tx1 vector of market returns
    #
    # OUTPUTS: beta     = 1xN vector of estimated beta coefficients
    #          sysRisk  = 1xN vector of stocks' systematic risk estimates
    #          specRisk = 1xN vector of stocks' company-specific risk estimates

    [T,N] = r.shape

    # initialise variables
    beta = np.full(N, np.nan)
    specRisk = np.full(N, np.nan)

    for i in np.arange(0,N):

        # construct the design matrix and dependent variable for the regression
        #
        # The design matrix has two columns: 
        #
        # column of ones (for the intercept) 
        # and a column of market returns (rIdx).
        #
        # np.ones((T,1)) — Column of 1s with T rows and 1 column
        # np.hstack((A, B)) — Horizontally stack arrays A and B to create a new array 
        # with the columns of A followed by the columns of B

        X = np.hstack((np.ones((T,1)), rIdx))

        # The dependent variable Y is the returns of the i-th stock, which is the i-th column of r
        Y = r[:,i]

        # run time series regressions for each stock
        # np.linalg.lstsq(X, Y, rcond=None)[0]
        #
        # This runs OLS (Ordinary Least Squares) linear regression — it finds the best-fit line through the data.
        #
        # What it's solving
        # The regression model is:
        #
        # Y = α + β × Market Return + error

        # Or in matrix form: Y = X · betas + error

        # Where:

        # Y = stock returns (what we're trying to explain)
        # X = the T×2 matrix [ones, market returns] (built in the previous line)
        # betas = the coefficients [α, β] we want to find

        betas = np.linalg.lstsq(X, Y, rcond=None)[0]

        beta[i] = betas[1]

        # Explaining specRisk[i] = np.nanstd(Y - X.dot(betas))
        #
        # This calculates the company-specific (idiosyncratic) risk for stock i. Let's break it apart:
        #
        # Step by step
        # 1. X.dot(betas) — Predicted returns
        # This computes the predicted stock returns based on the regression model:
        #
        # Predicted Return = α + β × Market Return
        #
        # These are the returns the stock should have had, if it perfectly followed the market.
        #
        # 2. Y - X.dot(betas) — Residuals (errors)
        # This subtracts the predicted returns from the actual returns:
        #
        # Residual = Actual Return − Predicted Return
        #
        # These residuals are the leftover movements that the market cannot explain. 
        # They represent things unique to that company 
        # — earnings surprises, management changes, product launches, scandals, etc.
        #
        # 3. np.nanstd(...) — Standard deviation of residuals
        # Takes the standard deviation of those residuals (ignoring any NaN values). 
        # Standard deviation = a measure of volatility/risk.
        #
        # specRisk[i] = np.nanstd(Y - X.dot(betas))
        #                          ↑        ↑
        #                        actual   predicted
        #                          return    return
        #                          └── residual ──┘
        #                                   ↓
        #                           std dev of residuals
        #                                   ↓
        #                           company-specific risk
        #
        # "How much does this stock wiggle around on its own, after removing the effect of the overall market?"
        #
        # High specific risk → The stock has a lot of unpredictable, company-specific movement
        # Low specific risk → The stock's movements are mostly explained by the market
        specRisk[i] = np.nanstd(Y - X.dot(betas))

    # Systematic Risk = β × σ(market)
    # A stock's market-driven risk = its sensitivity to the market × how volatile the market is
    sysRisk = beta * np.nanstd(rIdx)

# Total Stock Risk ≈ Systematic Risk + Specific Risk
#                   (from market)     (from company)
#                   can't avoid        can diversify away
    return beta, sysRisk, specRisk


datadir = r"C:\Users\Manpreet\OneDrive - City St George's, University of London\Documents\Term 2\SMM282 quantitative trading\SMM282_Quantitative_Trading\Exercises\session 4" + "\\"

r = pd.read_excel(datadir+'stockReturns.xlsx',sheet_name='Data',usecols=[1,2,3,4])
rIdx = pd.read_excel(datadir+'stockReturns.xlsx',sheet_name='Data',usecols=[5])
names = r.columns.tolist()

beta, sysRisk, specRisk = computeCAPMStats(r.values, rIdx.values)

# Create output folder for saving charts
output_dir = os.path.join(datadir, 'charts')
os.makedirs(output_dir, exist_ok=True)

# ============================================================
# All 3 charts in one figure
# ============================================================
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(8, 8))

# --- Chart 1: Betas ---
colors_beta = ['#c0392b' if b > 1 else '#2980b9' for b in beta]
bars = ax1.bar(names, beta, color=colors_beta, edgecolor='white', width=0.4)
ax1.axhline(y=1, color='gray', linestyle='--', linewidth=0.8, label='Market (β=1)')
ax1.set_title('CAPM Betas', fontsize=11, fontweight='bold')
ax1.set_ylabel('Beta (β)', fontsize=9)
for bar, b in zip(bars, beta):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
             f'{b:.2f}', ha='center', va='bottom', fontsize=8, fontweight='bold')
ax1.legend(fontsize=8)
ax1.set_ylim(0, max(beta) * 1.15)
ax1.tick_params(labelsize=8)

# --- Chart 2: Risk Decomposition (stacked) ---
x = np.arange(len(names))
totalRisk = sysRisk + specRisk
ax2.bar(x, sysRisk, 0.4, label='Systematic', color='#c0392b', edgecolor='white')
ax2.bar(x, specRisk, 0.4, bottom=sysRisk, label='Specific', color='#2980b9', edgecolor='white')
ax2.set_title('Risk Decomposition', fontsize=11, fontweight='bold')
ax2.set_ylabel('Risk (Std Dev)', fontsize=9)
ax2.set_xticks(x)
ax2.set_xticklabels(names, fontsize=8)
for i in range(len(names)):
    ax2.text(i, totalRisk[i] + 0.0002, f'{totalRisk[i]:.4f}',
             ha='center', va='bottom', fontsize=7)
ax2.legend(fontsize=8)
ax2.tick_params(labelsize=8)

# --- Chart 3: Beta vs Total Risk (scatter) ---
point_colors = ['#2c3e50', '#c0392b', '#2980b9', '#27ae60']
for i, name in enumerate(names):
    ax3.scatter(beta[i], totalRisk[i], s=100, c=point_colors[i], edgecolors='white', linewidth=1.5, zorder=5)
    ax3.annotate(name, (beta[i], totalRisk[i]), textcoords="offset points",
                 xytext=(6, 6), fontsize=7)
ax3.axvline(x=1, color='gray', linestyle='--', linewidth=0.8, label='Market (β=1)')
ax3.set_title('Beta vs Total Risk', fontsize=11, fontweight='bold')
ax3.set_xlabel('Beta (β)', fontsize=9)
ax3.set_ylabel('Total Risk', fontsize=9)
ax3.legend(fontsize=8)
ax3.grid(True, alpha=0.15, linestyle='--')
ax3.tick_params(labelsize=8)

plt.tight_layout()
fig.savefig(os.path.join(output_dir, 'capm_summary.png'), dpi=150, bbox_inches='tight')
print(f"Chart saved to {os.path.join(output_dir, 'capm_summary.png')}")
plt.show()

