#!/usr/bin/env python3
"""Check guidelines table schema"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Try to get a sample record to see the schema
try:
    result = supabase.table('guidelines').select('*').limit(1).execute()
    if result.data:
        print("Existing columns in 'guidelines' table:")
        for key in result.data[0].keys():
            print(f"  - {key}")
    else:
        print("Table exists but has no rows yet")
        print("\nTrying to insert a test record to see what columns are accepted...")

        test_data = {
            'title': 'TEST',
            'source': 'TEST',
            'content_type': 'guideline'
        }

        try:
            result = supabase.table('guidelines').insert(test_data).execute()
            print("Basic insert worked! Columns accepted:")
            for key in test_data.keys():
                print(f"  - {key}")
        except Exception as e:
            print(f"Insert failed: {e}")

except Exception as e:
    print(f"Error: {e}")
