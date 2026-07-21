import os
import pypdf

payslips_dir = r"C:\Users\mario\Desktop\Payslips"
files = [
    "Payslip 7 2023.pdf",
    "Payslip 7 2024.pdf",
    "Payslip 10 2024.pdf",
    "Payslip 6 2026.pdf"
]

# Let's write a function to parse each PDF manually or regex search it for values
def parse_payslip(filename):
    filepath = os.path.join(payslips_dir, filename)
    reader = pypdf.PdfReader(filepath)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

for f in files:
    text = parse_payslip(f)
    print("=" * 80)
    print(f"ANALYSIS OF {f}")
    print("=" * 80)
    
    # Print the lines containing key financial terms
    lines = text.split("\n")
    for line in lines:
        if any(term in line.lower() for term in ["dagvinna", "yfirvinna", "aukagrei", "brtt", "lfeyris", "stttar", "stagrei", "persn", "tborga", "alls/fr"]):
            print("  ", line)
