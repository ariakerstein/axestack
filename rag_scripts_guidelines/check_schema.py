#!/usr/bin/env python3
"""Check response_evaluations schema."""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

print("Fetching one record to see schema...\n")

try:
    result = supabase.table('response_evaluations')\
        .select('*')\
        .limit(1)\
        .execute()

    if result.data:
        print("Columns in response_evaluations:")
        for key in result.data[0].keys():
            print(f"  - {key}")
    else:
        print("No data found")

except Exception as e:
    print(f"Error: {e}")
