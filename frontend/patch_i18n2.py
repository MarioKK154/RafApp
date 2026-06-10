import os

path = r"c:\Users\mario\Desktop\RafApp\frontend\src\i18n.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

en_additions = """
      "home": "Home",
      "news": "News",
      "pricing": "Pricing",
      "about_us": "About Us",
      "contact": "Contact",
      "login": "Login",
      "Welcome to Our Platform": "Welcome to Our Platform",
      "We provide the best tools for your business.": "We provide the best tools for your business.",
      "Add your company's story here.": "Add your company's story here.",
      "Sóló & Lítil": "Solo & Small",
      "Meðalstór": "Medium",
      "Stórhópur": "Large Group",
      "Fyrirtæki": "Enterprise",
      "Allt að 10 notendur": "Up to 10 users",
      "Allt að 25 notendur": "Up to 25 users",
      "Allt að 65 notendur": "Up to 65 users",
      "66 eða fleiri notendur": "66+ users",
      "Kjarnakerfi fyrir lítil fyrirtæki": "Core system for small businesses",
      "Aukin stjórnunartól": "Advanced management tools",
      "Heildarlausn fyrir stærri aðila": "Complete solution for larger entities",
      "Sérsniðin lausn fyrir stórfyrirtæki": "Custom solution for enterprises",
"""

is_additions = """
      "home": "Heim",
      "news": "Fréttir",
      "pricing": "Verðskrá",
      "about_us": "Um Okkur",
      "contact": "Hafa Samband",
      "login": "Innskráning",
      "Welcome to Our Platform": "Velkomin á okkar svæði",
      "We provide the best tools for your business.": "Við bjóðum bestu tólin fyrir þinn rekstur.",
      "Add your company's story here.": "Settu inn sögu fyrirtækisins hér.",
      "Sóló & Lítil": "Sóló & Lítil",
      "Meðalstór": "Meðalstór",
      "Stórhópur": "Stórhópur",
      "Fyrirtæki": "Fyrirtæki",
      "Allt að 10 notendur": "Allt að 10 notendur",
      "Allt að 25 notendur": "Allt að 25 notendur",
      "Allt að 65 notendur": "Allt að 65 notendur",
      "66 eða fleiri notendur": "66 eða fleiri notendur",
      "Kjarnakerfi fyrir lítil fyrirtæki": "Kjarnakerfi fyrir lítil fyrirtæki",
      "Aukin stjórnunartól": "Aukin stjórnunartól",
      "Heildarlausn fyrir stærri aðila": "Heildarlausn fyrir stærri aðila",
      "Sérsniðin lausn fyrir stórfyrirtæki": "Sérsniðin lausn fyrir stórfyrirtæki",
"""

content = content.replace('"deactivate": "Deactivate",', en_additions + '\n      "deactivate": "Deactivate",')
content = content.replace('"general": "Almennt"', is_additions + '\n      "general": "Almennt"')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("i18n updated.")
