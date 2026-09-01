#!/usr/bin/env python3
"""
Fetch real market data for investment brief watchlist.
Uses yfinance to get historical daily closes.
"""

import yfinance as yf
import json
from datetime import datetime, timedelta

# Tickers to fetch
TICKERS = [
  'NVDA',
  'GOOGL',
  'AMZN',
  'AAPL',
  'META',
  'MSFT',
  'TSLA',
  'SPCX',
  '1810.HK',
  '1398.HK',
  'SPYM',
  'VEU',
  'GLD'
]

def fetch_ticker_data(symbol):
  """Fetch historical data for a ticker."""
  print(f'Fetching {symbol}...', end=' ', flush=True)
  
  try:
    ticker = yf.Ticker(symbol)
    
    # Fetch 1 year of data
    hist_1y = ticker.history(period='1y', interval='1d')
    
    if hist_1y.empty:
      print('❌ No data')
      return {
        'symbol': symbol,
        'name': symbol,
        'prices': {
          '1M': [],
          '3M': [],
          '1Y': []
        }
      }
    
    # Get ticker info for name
    try:
      info = ticker.info
      name = info.get('longName', symbol)
    except:
      name = symbol
    
    # Extract dates and closes
    dates = [d.strftime('%Y-%m-%d') for d in hist_1y.index]
    closes = hist_1y['Close'].tolist()
    
    # Build full 1Y data
    data_1y = [
      {'date': d, 'close': round(c, 2)}
      for d, c in zip(dates, closes)
      if c == c  # Filter out NaN
    ]
    
    # Extract 3M (last 90 days)
    data_3m = data_1y[-90:] if len(data_1y) >= 90 else data_1y
    
    # Extract 1M (last 30 days)
    data_1m = data_1y[-30:] if len(data_1y) >= 30 else data_1y
    
    latest_price = data_1y[-1]['close'] if data_1y else 0
    print(f'✅ Latest: ${latest_price:.2f} ({len(data_1y)} days)')
    
    return {
      'symbol': symbol,
      'name': name,
      'prices': {
        '1M': data_1m,
        '3M': data_3m,
        '1Y': data_1y
      }
    }
    
  except Exception as e:
    print(f'❌ Error: {str(e)[:50]}')
    return {
      'symbol': symbol,
      'name': symbol,
      'prices': {
        '1M': [],
        '3M': [],
        '1Y': []
      }
    }

def main():
  print('📊 Fetching real market data from Yahoo Finance...\n')
  
  tickers_data = []
  
  for symbol in TICKERS:
    data = fetch_ticker_data(symbol)
    tickers_data.append(data)
  
  # Build final JSON structure
  watchlist = {
    'lastUpdated': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'tickers': tickers_data
  }
  
  # Write to file
  output_path = 'data/watchlist.json'
  with open(output_path, 'w') as f:
    json.dump(watchlist, f, indent=2)
  
  print(f'\n✅ Saved to {output_path}')
  
  # Summary
  success = sum(1 for t in tickers_data if t['prices']['1Y'])
  empty = len(tickers_data) - success
  print(f'\n📈 Summary: {success} tickers with data, {empty} empty')
  
  if empty > 0:
    empty_tickers = [t['symbol'] for t in tickers_data if not t['prices']['1Y']]
    print(f'⚠️  Empty tickers: {", ".join(empty_tickers)}')

if __name__ == '__main__':
  main()
