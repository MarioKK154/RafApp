import requests
from bs4 import BeautifulSoup
import json

def search_ronning(query):
    print(f"--- Ronning: {query} ---")
    url = f"https://www.ronning.is/leit/?q={query}"
    resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(resp.text, 'html.parser')
    products = soup.find_all('div', class_='product-list-item')
    for p in products[:5]:
        a = p.find('a', class_='product-item-link')
        if a:
            print(f" {a.text.strip()} | {a['href']}")

def search_iskraft(query):
    print(f"--- Iskraft: {query} ---")
    # Iskraft might be using dynamic loading, let's see if HTML has it
    url = f"https://iskraft.husa.is/leit?SearchTerm={query}"
    resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(resp.text, 'html.parser')
    products = soup.find_all('a', class_='product-item')
    for p in products[:5]:
        title = p.find('div', class_='product-title')
        if title:
            print(f" {title.text.strip()} | https://iskraft.husa.is{p['href']}")

def search_reykjafell(query):
    print(f"--- Reykjafell: {query} ---")
    # Using Reykjafell's next.js data endpoint or GraphQL
    # We can just fetch the search HTML and parse __NEXT_DATA__
    url = f"https://www.reykjafell.is/vorur?q={query}"
    resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(resp.text, 'html.parser')
    script = soup.find('script', id='__NEXT_DATA__')
    if script:
        data = json.loads(script.string)
        # Try to find Apollo state
        apollo = data.get('props', {}).get('pageProps', {}).get('apolloState', {})
        count = 0
        for key, val in apollo.items():
            if val.get('__typename') == 'Product':
                title = val.get('title')
                sku = val.get('sku')
                print(f" {title} | https://www.reykjafell.is/vorur?q={sku}")
                count += 1
                if count >= 5: break

search_ronning("netbakki")
search_ronning("kapalgrind")
search_iskraft("netbakki")
search_iskraft("kapalgrind")
search_reykjafell("netbakki")
search_reykjafell("kapalgrind")
