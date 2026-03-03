# solveFamaMacBethExercise.py

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

def famaMacBeth(factor, returns):

    [T, N] = factor.shape

    gamma = np.full(T, np.nan)

    for t in np.arange(1,T):

        """     
        Take one row of stock returns (for time period t) and turn it from a horizontal row into a vertical column.
        returns[t] — grabs row t from the returns array.
        If you have 5 stocks, this gives you a 1D array like:
        [0.01, 0.02, -0.01, 0.03, 0.00]
        
        returns[t, np.newaxis] 
        np.newaxis adds a new dimension to the array, turning it from a 1D array into a 2D array. 
        [[0.01, 0.02, -0.01, 0.03, 0.00]]
        
        The .T at the end transposes the array,
        So, the array becomes:
        [[0.01],
         [0.02],
         [-0.01],
         [0.03],
         [0.00]] 
        """
        Y = returns[t,np.newaxis].T

        """     
        Build the design matrix X for a cross-sectional regression: 
        a column of 1s (for the intercept) stacked next to a column of each stock's beta from the previous period.
        np.ones((N, 1)) — Creates a column of 1s with N rows (one per stock).
        [[1],
         [1],
         [1],
         [1],
         [1]]
        Shape: (5, 1) — This is the intercept term for the regression.
        
        factor[t-1, np.newaxis].T — Takes the previous period's betas and makes them a column vector.
        
        This is the exact same pattern you just learned:
        Step              Code                            Shape
        Grab row          factor[t-1] 	                (5,) → [0.8, 1.2, 0.6, 1.1, 0.9]
        Add dimension	    factor[t-1, np.newaxis]	        (1, 5) → [[0.8, 1.2, 0.6, 1.1, 0.9]]
        Transpose	        .T	                            (5, 1) → [[0.8], [1.2], [0.6], [1.1], [0.9]]
        
        Why t-1? Because Fama-MacBeth uses last period's betas to predict this period's returns. 
        You estimate betas first, then test if they explain returns in the next period.
        
        np.hstack((..., ...)) — Horizontally stacks the two columns side by side.
        [[1, 0.8],        ← Stock 1: intercept + its beta
         [1, 1.2],        ← Stock 2
         [1, 0.6],        ← Stock 3
         [1, 1.1],        ← Stock 4
         [1, 0.9]]        ← Stock 5
        
        Return_stock_i(t) = γ₀ + γ₁ × Beta_stock_i(t-1) + error
        So, the first column is the intercept (γ₀): 
        Column 1 (ones) → estimates γ₀ (intercept)
        
        The second column is the beta (γ₁ × Beta_stock_i(t-1)).
        Column 2 (betas) → estimates γ₁ (the market risk premium — the reward for taking on market risk)
        """
        X = np.hstack((np.ones((N,1)), factor[t-1,np.newaxis].T))
        """
        Run a regression of stock returns on betas, then grab just the γ₁ coefficient (the market risk premium) 
        and store it for this time period.
        
        1. np.linalg.lstsq(X, Y, rcond=None) — Runs OLS regression.
        Y = X · coefficients + error
        i.e. Return_stock_i(t) = γ₀ + γ₁ × Beta_stock_i(t-1) + error
        It returns a tuple of 4 things:
        
        Index	What it contains
        [0]	The coefficients (the solution)
        [1]	The residuals (sum of squared errors)
        [2]	The rank of matrix X
        [3]	The singular values of X
        
        2. [0] — Grabs the coefficients array from that tuple.
        
        This gives you: 
        [[γ₀],      ← intercept
         [γ₁]]      ← market risk premium
        
        Shape: (2, 1) — two coefficients (because X has 2 columns).
        
        3. [1] — From the coefficients, grabs the second one (index 1), which is γ₁.
        
        [0][0] would be γ₀ (the intercept) — not interesting here
        [0][1] is γ₁ (the slope) — this is what we want: how much extra return do you get for each unit of beta?
        
        4. gamma[t] = ... — Stores this γ₁ value in the gamma array at position t
        
        The big picture logic:
        The loop runs this regression once for every time period. So you end up with:
        gamma = [NaN, γ₁(1), γ₁(2), γ₁(3), ..., γ₁(T-1)]
                  ↑
               period 0 is NaN because there's no t-1 beta for it
        
        Each γ₁ answers: 
        In this particular month, were stocks with higher betas actually rewarded with higher returns?
        """
        gamma[t] = np.linalg.lstsq(X, Y, rcond=None)[0][1][0]

        """
        t-statistic = mean(γ) / std error(γ))
        The t-statistic tests whether the average γ₁ across all time periods is significantly different from zero.
        If the t-statistic is large (in absolute value), it suggests that there is a statistically significant 
        relationship between beta and returns, meaning that the market risk premium is not zero.

        """
    tstat = np.nanmean(gamma) / (np.nanstd(gamma) / np.sqrt(T))

    return gamma, tstat

datadir = r"C:\Users\Manpreet\OneDrive - City St George's, University of London\Documents\Term 2\SMM282 quantitative trading\SMM282_Quantitative_Trading\Exercises\session 4" + "\\"

dates = pd.read_excel(datadir+'uk_data.xlsx',sheet_name='returns',usecols=[0])
r = pd.read_excel(datadir+'uk_data.xlsx',sheet_name='returns',usecols=[1,2,3,4,5])
betas = pd.read_excel(datadir+'uk_data.xlsx',sheet_name='beta',usecols=[1,2,3,4,5])
names = r.columns.tolist()

[gamma, tstat] = famaMacBeth(betas.values, r.values)

output_dir = os.path.join(datadir, 'charts')
os.makedirs(output_dir, exist_ok=True)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 6))

# --- Chart 1: Factor Returns (γ₁) over time ---
# Each point is the γ₁ from one cross-sectional regression.
# It shows: "In each period, how much extra return did high-beta stocks earn?"
# If the line is mostly above zero → the market generally rewards risk.
# If it swings wildly → the risk premium is unstable over time.
ax1.plot(gamma, color='#2980b9', linewidth=1)
ax1.axhline(y=0, color='gray', linestyle='--', linewidth=0.8)
ax1.set_title('Factor Returns (γ₁) Over Time', fontsize=11, fontweight='bold')
ax1.set_ylabel('γ₁ (Risk Premium)', fontsize=9)
ax1.set_xlabel('Time Period', fontsize=9)
ax1.tick_params(labelsize=8)
ax1.grid(True, alpha=0.15, linestyle='--')

# --- Chart 2: Mean γ₁ and T-Statistic ---
# Mean Factor Return: the average γ₁ across all periods — the estimated market risk premium.
#   Positive → stocks with higher betas earned higher returns on average.
# T-Stat: tests if the mean γ₁ is statistically significant (|t| > 2 ≈ significant at 5%).
#   Large |t| → confident that the risk premium is real, not just noise.
labels = ['Mean γ₁\n(Risk Premium)', 'T-Statistic']
values = [np.nanmean(gamma), tstat]
colors = ['#2980b9', '#c0392b' if abs(tstat) > 2 else '#95a5a6']
bars = ax2.bar(labels, values, color=colors, width=0.4, edgecolor='white')
for bar, v in zip(bars, values):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.002,
             f'{v:.4f}', ha='center', va='bottom', fontsize=8, fontweight='bold')
ax2.axhline(y=0, color='gray', linestyle='--', linewidth=0.8)
ax2.set_title('Mean Factor Return & T-Statistic', fontsize=11, fontweight='bold')
ax2.tick_params(labelsize=8)

plt.tight_layout()
fig.savefig(os.path.join(output_dir, 'fama_macbeth_summary.png'), dpi=150, bbox_inches='tight')
print(f"Chart saved to {os.path.join(output_dir, 'fama_macbeth_summary.png')}")
plt.show()

