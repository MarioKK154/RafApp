import os
import pypdf

payslips_dir = r"C:\Users\mario\Desktop\Payslips"

def print_raw_text(filename):
    filepath = os.path.join(payslips_dir, filename)
    reader = pypdf.PdfReader(filepath)
    print("=" * 80)
    print(f"RAW TEXT: {filename}")
    print("=" * 80)
    for i, page in enumerate(reader.pages):
        print(page.extract_text())

print_raw_text("Payslip 7 2023.pdf")
