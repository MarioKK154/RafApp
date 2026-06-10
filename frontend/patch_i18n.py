import os

path = r"c:\Users\mario\Desktop\RafApp\frontend\src\i18n.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

en_additions = """
      "lead_success": "Thank you! We will be in touch shortly.",
      "lead_error": "Failed to submit form. Please try again or contact us directly.",
      "hero_eyebrow": "RafApp - Elevating Your Workflow",
      "get_started": "Get Started",
      "learn_more": "Learn More",
      "latest_news": "Latest News & Updates",
      "news_subtitle": "Stay up to date with the latest features, releases, and announcements.",
      "read_more": "Read More",
      "no_news": "No news items currently published.",
      "pricing_plans": "Pricing Plans",
      "pricing_subtitle": "Choose the perfect plan for your business needs.",
      "most_popular": "Most Popular",
      "custom_pricing_msg": "Contact us for custom pricing tailored to your needs.",
      "about_us_title": "About Us",
      "contact_us": "Contact Us",
      "no_contact_info": "No contact information available.",
      "your_name": "Your Name",
      "company_name": "Company Name",
      "email_address": "Email Address",
      "phone_optional": "Phone Number (Optional)",
      "sending": "Sending...",
      "request_access": "Request Access",
"""

is_additions = """
      "lead_success": "Takk fyrir! Við höfum samband fljótlega.",
      "lead_error": "Ekki tókst að senda fyrirspurn. Vinsamlegast reyndu aftur eða hafðu samband beint.",
      "hero_eyebrow": "RafApp - Bætir Vinnuflæðið Þitt",
      "get_started": "Hefja Leik",
      "learn_more": "Nánar",
      "latest_news": "Nýjustu Fréttir",
      "news_subtitle": "Fylgstu með nýjustu eiginleikum og tilkynningum.",
      "read_more": "Lesa Meira",
      "no_news": "Engar fréttir birtar sem stendur.",
      "pricing_plans": "Verðskrá",
      "pricing_subtitle": "Veldu plan sem hentar þínum þörfum best.",
      "most_popular": "Vinsælast",
      "custom_pricing_msg": "Hafðu samband fyrir sérsniðin tilboð að ykkar þörfum.",
      "about_us_title": "Um Okkur",
      "contact_us": "Hafa Samband",
      "no_contact_info": "Engar samskiptaupplýsingar aðgengilegar.",
      "your_name": "Þitt Nafn",
      "company_name": "Nafn Fyrirtækis",
      "email_address": "Netfang",
      "phone_optional": "Símanúmer (Valfrjálst)",
      "sending": "Sendi...",
      "request_access": "Bóka Aðgang",
"""

content = content.replace('"deactivate": "Deactivate",', en_additions + '\n      "deactivate": "Deactivate",')
content = content.replace('"general": "Almennt"', is_additions + '\n      "general": "Almennt"')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("i18n updated.")
