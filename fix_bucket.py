import psycopg2

try:
    # Connect to local Supabase Postgres
    # Default password for local supabase is 'postgres'
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="your-super-secret-and-long-postgres-password", # Standard local dev password often used or 'postgres'
        host="127.0.0.1",
        port="54322"
    )
    conn.autocommit = True
    cur = conn.cursor()

    # Create bucket
    print("Creating bucket 'water_images'...")
    cur.execute("""
    insert into storage.buckets (id, name, public)
    values ('water_images', 'water_images', true)
    on conflict (id) do nothing;
    """)

    # Policies
    print("Creating policies...")
    # Drop existing policies to avoid errors if they exist partially
    cur.execute("drop policy if exists \"Public Access\" on storage.objects;")
    cur.execute("drop policy if exists \"Authenticated Users Can Upload\" on storage.objects;")
    
    cur.execute("""
    create policy "Public Access"
    on storage.objects for select
    using ( bucket_id = 'water_images' );
    """)
    
    cur.execute("""
    create policy "Authenticated Users Can Upload"
    on storage.objects for insert
    with check ( bucket_id = 'water_images' and auth.role() = 'authenticated' );
    """)

    print("Success!")
    cur.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
    # Try alternate password 'postgres' just in case
    try:
        print("Retrying with password 'postgres'...")
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="postgres",
            host="127.0.0.1",
            port="54322"
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        cur.execute("insert into storage.buckets (id, name, public) values ('water_images', 'water_images', true) on conflict (id) do nothing;")
        cur.execute("""drop policy if exists "Public Access" on storage.objects;""")
        cur.execute("""create policy "Public Access" on storage.objects for select using ( bucket_id = 'water_images' );""")
        cur.execute("""drop policy if exists "Authenticated Users Can Upload" on storage.objects;""")
        cur.execute("""create policy "Authenticated Users Can Upload" on storage.objects for insert with check ( bucket_id = 'water_images' and auth.role() = 'authenticated' );""")
        print("Success on retry!")
    except Exception as e2:
         print(f"Error on retry: {e2}")
