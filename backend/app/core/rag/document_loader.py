import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.documents import Document
import pandas as pd

class ExcelLoader:
    """Custom Excel loader that converts spreadsheets to text documents using pandas."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
    
    def load(self) -> List[Document]:
        """Load Excel file and convert to documents."""
        documents = []
        
        try:
            # Load all sheets
            xls = pd.ExcelFile(self.file_path)
            
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(self.file_path, sheet_name=sheet_name)
                
                # Drop all-NaN rows/cols
                df = df.dropna(how='all').dropna(axis=1, how='all')
                
                # Convert to markdown table format or simple text
                if not df.empty:
                    # Convert dataframe to string representation
                    content = f"### 시트: {sheet_name}\n\n"
                    
                    # Method 1: Convert to CSV-like string for better token efficiency
                    # content += df.to_csv(index=False)
                    
                    # Method 2: Iterate rows for cleaner text
                    rows = []
                    # Get columns
                    rows.append(" | ".join(map(str, df.columns)))
                    rows.append("|".join(["---"] * len(df.columns)))
                    
                    for _, row in df.iterrows():
                        row_values = []
                        for val in row:
                            if pd.isna(val):
                                row_values.append("")
                            else:
                                row_values.append(str(val))
                        rows.append(" | ".join(row_values))
                    
                    content += "\n".join(rows)
                    
                    documents.append(Document(
                        page_content=content,
                        metadata={
                            "source": self.file_path,
                            "sheet": sheet_name,
                            "file_path": self.file_path,
                            "file_type": "excel"
                        }
                    ))
            
        except Exception as e:
            raise ValueError(f"Failed to load Excel file: {str(e)}")
        
        return documents


class UniversalDocumentLoader:
    """Document Loader that delegates to specific loaders based on file extension."""
    
    @classmethod
    def load(cls, file_path: str) -> List[Document]:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        elif ext == '.docx':
            loader = Docx2txtLoader(file_path)
        elif ext in ['.txt', '.md']:
            # Use UTF-8 encoding for text files to support Korean
            loader = TextLoader(file_path, encoding='utf-8')
        elif ext in ['.xlsx', '.xls']:
            # Excel files (using pandas)
            loader = ExcelLoader(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
        
        documents = loader.load()
        
        # Ensure all content is properly encoded
        for doc in documents:
            if doc.page_content:
                # Clean up any encoding issues
                doc.page_content = doc.page_content.encode('utf-8', errors='ignore').decode('utf-8')
        
        return documents
