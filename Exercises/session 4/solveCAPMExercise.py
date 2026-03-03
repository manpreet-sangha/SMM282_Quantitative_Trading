# solveCAPMExercise.py

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
        # The design matrix has two columns: a column of ones (for the intercept) and a column of market returns (rIdx).
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
        specRisk[i] = np.nanstd(Y - X.dot(betas))


    sysRisk = beta * np.nanstd(rIdx)

    return beta, sysRisk, specRisk


datadir = r"C:\Users\Manpreet\OneDrive - City St George's, University of London\Documents\Term 2\SMM282 quantitative trading\SMM282_Quantitative_Trading\Exercises\session 4" + "\\"

r = pd.read_excel(datadir+'stockReturns.xlsx',sheet_name='Data',usecols=[1,2,3,4])
rIdx = pd.read_excel(datadir+'stockReturns.xlsx',sheet_name='Data',usecols=[5])
names = r.columns.tolist()

beta, sysRisk, specRisk = computeCAPMStats(r.values, rIdx.values)

plt.figure(figsize=(10,6))

plt.subplot(3,1,1)
plt.bar(names,beta)
plt.title('Betas')

plt.subplot(3,1,2)
plt.bar(names,sysRisk)
plt.title('Systematic Risk')

plt.subplot(3,1,3)
plt.bar(names,specRisk)
plt.title('Specific Risk')
plt.show()

