# solveCAPMExercise.py

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from adjustText import adjust_text

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
# CHART 1: Beta values with reference line at β=1
# ============================================================
colors_beta = ['#e74c3c' if b > 1 else '#3498db' for b in beta]

fig1, ax1 = plt.subplots(figsize=(10, 5), num='Chart 1 — CAPM Betas')
bars = ax1.bar(names, beta, color=colors_beta, edgecolor='white', linewidth=1.5)
ax1.axhline(y=1, color='gray', linestyle='--', linewidth=1, label='Market (β=1)')
ax1.set_title('CAPM Betas — Market Sensitivity', fontsize=16, fontweight='bold', pad=15)
ax1.set_ylabel('Beta (β)', fontsize=12)

# Add value labels on each bar
for bar, b in zip(bars, beta):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.03,
             f'{b:.2f}', ha='center', va='bottom', fontsize=12, fontweight='bold')

ax1.legend(fontsize=11)
ax1.set_ylim(0, max(beta) * 1.25)
ax1.spines['top'].set_visible(False)
ax1.spines['right'].set_visible(False)
plt.tight_layout()
fig1.savefig(os.path.join(output_dir, '1_betas.png'), dpi=150, bbox_inches='tight')
print(f"Chart 1 saved to {os.path.join(output_dir, '1_betas.png')}")
plt.show(block=False)

# ============================================================
# CHART 2: Stacked bar — Systematic vs Specific Risk with individual contributions
# ============================================================
fig2, ax2 = plt.subplots(figsize=(10, 6), num='Chart 2 — Risk Decomposition')
x = np.arange(len(names))
width = 0.5

totalRisk = sysRisk + specRisk
sysPct = (sysRisk / totalRisk) * 100
specPct = (specRisk / totalRisk) * 100

bars_sys = ax2.bar(x, sysRisk, width, label='Systematic Risk (Market)', color='#c0392b', edgecolor='white')
bars_spec = ax2.bar(x, specRisk, width, bottom=sysRisk, label='Specific Risk (Company)', color='#2980b9', edgecolor='white')

ax2.set_title('Risk Decomposition — Systematic vs Company-Specific', fontsize=16, fontweight='bold', pad=15)
ax2.set_ylabel('Risk (Std Dev of Returns)', fontsize=12)
ax2.set_xticks(x)
ax2.set_xticklabels(names, fontsize=10)
ax2.legend(fontsize=11, loc='upper right')

# Add individual contribution labels inside each segment
for i in range(len(names)):
    # Systematic risk label (inside lower bar)
    ax2.text(i, sysRisk[i] / 2, f'{sysRisk[i]:.4f}\n({sysPct[i]:.1f}%)',
             ha='center', va='center', fontsize=9, fontweight='bold', color='white')
    # Specific risk label (inside upper bar)
    ax2.text(i, sysRisk[i] + specRisk[i] / 2, f'{specRisk[i]:.4f}\n({specPct[i]:.1f}%)',
             ha='center', va='center', fontsize=9, fontweight='bold', color='white')

# Add total risk labels on top
for i, t in enumerate(totalRisk):
    ax2.text(i, t + 0.0005, f'Total: {t:.4f}', ha='center', va='bottom', fontsize=10, fontweight='bold')

ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)
plt.tight_layout()
fig2.savefig(os.path.join(output_dir, '2_risk_decomposition.png'), dpi=150, bbox_inches='tight')
print(f"Chart 2 saved to {os.path.join(output_dir, '2_risk_decomposition.png')}")
plt.show(block=False)

# ============================================================
# CHART 3: Scatter plot — Beta vs Total Risk (auto-adjusted labels)
# ============================================================
fig3, ax3 = plt.subplots(figsize=(10, 7), num='Chart 3 — Beta vs Total Risk')
totalRisk = sysRisk + specRisk

# Professional color palette
point_colors = ['#2c3e50', '#c0392b', '#2980b9', '#27ae60']

# Plot each stock as a distinct point
for i, name in enumerate(names):
    ax3.scatter(beta[i], totalRisk[i], s=300, c=point_colors[i % len(point_colors)],
                edgecolors='white', linewidth=2, zorder=5, label=name)

# Create text objects for adjustText to auto-position
texts = []
for i, name in enumerate(names):
    t = ax3.text(beta[i], totalRisk[i],
                 f'  {name}\n  β={beta[i]:.2f}  Risk={totalRisk[i]:.4f}',
                 fontsize=9, fontfamily='sans-serif',
                 bbox=dict(boxstyle='round,pad=0.4', facecolor='#f8f9fa',
                           edgecolor=point_colors[i % len(point_colors)], alpha=0.95))
    texts.append(t)

# Auto-adjust text positions to avoid all overlaps
adjust_text(texts, ax=ax3,
            arrowprops=dict(arrowstyle='->', color='#adb5bd', lw=1.2),
            expand=(2.0, 2.0),
            force_text=(1.5, 1.5),
            force_points=(1.0, 1.0))

ax3.axvline(x=1, color='#adb5bd', linestyle='--', linewidth=1, alpha=0.8, label='Market (β=1)')

ax3.set_xlabel('Beta (β) — Market Sensitivity', fontsize=12, fontfamily='sans-serif')
ax3.set_ylabel('Total Risk (Systematic + Specific)', fontsize=12, fontfamily='sans-serif')
ax3.set_title('Beta vs Total Risk', fontsize=16, fontweight='bold', fontfamily='sans-serif', pad=15)

# Add generous margin so labels never get clipped
x_margin = (max(beta) - min(beta)) * 0.5
y_margin = (max(totalRisk) - min(totalRisk)) * 0.5
ax3.set_xlim(min(beta) - x_margin, max(beta) + x_margin)
ax3.set_ylim(min(totalRisk) - y_margin, max(totalRisk) + y_margin)

ax3.legend(fontsize=10, loc='lower right', framealpha=0.9)
ax3.spines['top'].set_visible(False)
ax3.spines['right'].set_visible(False)
ax3.grid(True, alpha=0.2, linestyle='--')
plt.tight_layout()
fig3.savefig(os.path.join(output_dir, '3_beta_vs_total_risk.png'), dpi=150, bbox_inches='tight')
print(f"Chart 3 saved to {os.path.join(output_dir, '3_beta_vs_total_risk.png')}")
plt.show(block=False)

# Keep all windows open until user closes them
print(f"\nAll charts saved to: {output_dir}")
print("Close all chart windows to exit.")
plt.show()

