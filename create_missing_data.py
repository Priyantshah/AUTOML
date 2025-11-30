import pandas as pd
import numpy as np

# Create a dataset with missing values
data = {
    'Feature_A': [1, 2, np.nan, 4, 5, np.nan, 7, 8, 9, 10],
    'Feature_B': [10, np.nan, 30, 40, 50, 60, np.nan, 80, 90, 100],
    'Target': [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
}

df = pd.DataFrame(data)
df.to_csv('datasets/missing_values_test.csv', index=False)
print("Created datasets/missing_values_test.csv with missing values.")
