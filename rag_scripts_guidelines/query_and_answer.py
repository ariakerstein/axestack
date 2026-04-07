import os
import ast
import openai
import numpy as np
from dotenv import load_dotenv
from supabase import create_client

# --- Load environment variables ---
load_dotenv()
SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
OPENAI_API_KEY = "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"
ANTHROPIC_API_KEY = "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"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# --- Generate embedding for user query ---
def get_query_embedding(text):
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=[text]
    )
    return response.data[0].embedding

# --- Retrieve top-k chunks by cosine similarity ---
def retrieve_chunks(query_embedding, top_k=5):
    response = supabase.table("guideline_chunks") \
        .select("topic, chunk_text, cancer_type, chunk_embedding_vec") \
        .limit(10000) \
        .execute()

    chunks = response.data
    results = []

    for chunk in chunks:
        try:
            vec = chunk['chunk_embedding_vec']

            # Skip empty or malformed embeddings
            if not vec or isinstance(vec, (str, list)) and len(vec) < 10:
                continue
            if isinstance(vec, str):
                vec = ast.literal_eval(vec)
            if not isinstance(vec, list) or any(v is None for v in vec):
                continue

            score = np.dot(query_embedding, vec) / (np.linalg.norm(query_embedding) * np.linalg.norm(vec))
            chunk['similarity'] = score
            results.append(chunk)
        except Exception as e:
            print(f"⚠️ Skipping chunk due to error: {e}")

    top_chunks = sorted(results, key=lambda x: x['similarity'], reverse=True)[:top_k]

    if not top_chunks:
        print("⚠️ No similar chunks found.")
        return []

    print("\n🔍 Retrieved Top Chunks:")
    for i, chunk in enumerate(top_chunks):
        print(f"{i+1}. {chunk['topic']} (Cancer: {chunk['cancer_type']}, Score: {chunk['similarity']:.4f})")

    return top_chunks

# --- Build prompt for Claude ---
def build_prompt(retrieved_chunks, user_question):
    if not retrieved_chunks:
        return f"You asked: {user_question}\n\nNo relevant information was found in the database to answer this question."

    preamble = """You are a helpful assistant answering patient questions using trusted content from NCCN guidelines. Only use the excerpts provided. If the answer is unclear or incomplete, say so and offer to refer the user to a care team member."""

    context = "\n\n".join([
        f"Excerpt {i+1} (Topic: {chunk['topic']} – Cancer: {chunk['cancer_type']}):\n{chunk['chunk_text']}"
        for i, chunk in enumerate(retrieved_chunks)
    ])

    question = f"\n\nUser Question:\n{user_question}"

    instructions = (
        "\n\nInstructions:\n"
        "- Use only the information provided in the excerpts.\n"
        "- If the answer is uncertain, say 'Based on the information provided, I can’t answer that precisely.'\n"
        "- Use clear and supportive language."
    )

    return f"{preamble}\n\n{context}\n{question}\n{instructions}"

# --- Main Execution ---
if __name__ == "__main__":
    user_question = input("Ask a question about ALL guidelines: ")

    query_embedding = get_query_embedding(user_question)
    chunks = retrieve_chunks(query_embedding, top_k=5)
    prompt = build_prompt(chunks, user_question)

    print("\n🧠 Prompt sent to Claude:\n")
    print(prompt)

    # If you want to send to Claude (pseudo-code)
    # response = claude_client.chat(messages=[{"role": "user", "content": prompt}])
    # print(response.content)

