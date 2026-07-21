import os
import pypdf # Let's try standard pypdf first

payslips_dir = r"C:\Users\mario\Desktop\Payslips"
files = [
    "Payslip 7 2023.pdf",
    "Payslip 7 2024.pdf",
    "Payslip 10 2024.pdf",
    "Payslip 6 2026.pdf"
]

for filename in files:
    filepath = os.path.join(payslips_dir, filename)
    print("=" * 60)
    print(f"FILE: {filename}")
    print("=" * 60)
    if not os.path.exists(filepath):
        print("File does not exist.")
        continue
    try:
        reader = pypdf.PdfReader(filepath)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            print(text)
    except Exception as e:
        print(f"Error parsing PDF: {e}")
