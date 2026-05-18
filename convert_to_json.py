import pandas as pd
import json
import re

def convert_excel_to_js(file_path, output_path):
    try:
        # Load the excel file without header
        df = pd.read_excel(file_path, header=None)
        
        words = []
        current_unit = "Default"
        
        for index, row in df.iterrows():
            col0 = str(row[0]).strip() if pd.notna(row[0]) else ""
            col1 = str(row[1]).strip() if pd.notna(row[1]) else ""
            col2 = str(row[2]).strip() if pd.notna(row[2]) else "" # Phonetic
            col3 = str(row[3]).strip() if pd.notna(row[3]) else "" # Meaning
            # New column for confusing words (col 4)
            col4 = str(row[4]).strip() if len(row) > 4 and pd.notna(row[4]) else "" 
            
            if "list" in col0.lower():
                current_unit = col0
                continue
                
            if col1 and col3: # Ensure word and meaning exist
                words.append({
                    "id": len(words) + 1,
                    "unit": current_unit,
                    "word": col1,
                    "phonetic": col2,
                    "meaning": col3,
                    "confusing": col4 # Added confusing words field
                })
        
        # Write as a JS file with a global variable
        json_str = json.dumps(words, ensure_ascii=False, indent=2)
        js_content = f"window.wordData = {json_str};"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
            
        print(f"Successfully converted {len(words)} words to {output_path}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    file_path = r'd:\考研学习\英语\绿皮书单词\单词书\单词数据.xlsx'
    output_path = r'd:\考研学习\英语\绿皮书单词\words.js'
    convert_excel_to_js(file_path, output_path)
