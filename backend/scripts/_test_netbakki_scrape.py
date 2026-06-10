import requests
from bs4 import BeautifulSoup
import json

def test_ronning():
    print("Testing Ronning...")
    url = "https://www.ronning.is/leit/?q=netbakki"
    resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(resp.text, 'html.parser')
    products = soup.find_all('div', class_='product-list-item')
    for p in products[:5]:
        a = p.find('a', class_='product-item-link')
        if a:
            print(f" - {a.text.strip()} | {a['href']}")
            
def test_iskraft():
    print("Testing Iskraft...")
    url = "https://iskraft.husa.is/leit?SearchTerm=netbakki"
    resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(resp.text, 'html.parser')
    products = soup.find_all('div', class_='product-box')
    if not products:
        products = soup.find_all('a', class_='product-item')
    if not products:
        # Check API
        pass
    for p in products[:5]:
        print(f" - {p.text.strip()}")

test_ronning()
test_iskraft()
