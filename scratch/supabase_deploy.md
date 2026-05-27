# Panduan Deployment Push Notification

## Langkah 1: Buat Tabel Database
Buka Supabase Dashboard > SQL Editor, lalu jalankan query ini:

```sql
-- Create table for Push Subscriptions
CREATE TABLE public.push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    chat_id UUID,
    endpoint TEXT NOT NULL UNIQUE,
    auth TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow anonymous access (karena kita tidak pakai login untuk klien)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for anonymous users" ON public.push_subscriptions FOR ALL USING (true);
```

## Langkah 2: Simpan VAPID Keys di Supabase Secrets
Buka Terminal/Command Prompt Anda di direktori `c:\Users\yasir\Herd\HimawariDigi` lalu jalankan:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY=BJgkti3bRXGoIaPq5bt3S346p0yhbw4GC8zAw7e8c7ulFpoa3huVb5PghF3jGWULnq0RpS2Hgs-jPTMXYJMyRus
npx supabase secrets set VAPID_PRIVATE_KEY=ERKIoxzqbIySerSpcqxg0Kqf0-6CZcOaTDy1wE5kD3w
```
*(Gunakan `--project-ref [ID PROJECT ANDA]` jika Anda belum melink-nya).*

## Langkah 3: Deploy Edge Function
Jalankan perintah ini di Terminal:

```bash
npx supabase functions deploy send-push
```

## Langkah 4: Buat Database Webhook (Trigger)
1. Buka **Supabase Dashboard**.
2. Masuk ke menu **Database** > **Webhooks**.
3. Klik **Create a new Hook**.
4. **Name**: `Send Push Notification`
5. **Table**: `messages`
6. **Events**: Centang `Insert` saja.
7. **Type**: Pilih **Supabase Edge Functions**.
8. **Method**: `POST`
9. **Edge Function**: Pilih `send-push`.
10. Klik **Create webhook**.

Selesai! Coba buka tab baru `https://himawaridigi.test/cs.html`, browser akan meminta izin notifikasi ("Allow Notifications"). Setelah diizinkan, tutup tabnya dan cobalah mengirim pesan dari sisi klien. Notifikasi akan muncul!
