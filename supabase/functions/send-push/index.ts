import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BJgkti3bRXGoIaPq5bt3S346p0yhbw4GC8zAw7e8c7ulFpoa3huVb5PghF3jGWULnq0RpS2Hgs-jPTMXYJMyRus';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'ERKIoxzqbIySerSpcqxg0Kqf0-6CZcOaTDy1wE5kD3w';

webPush.setVapidDetails(
  'mailto:himawaridigi@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const corsHeaders = {
  // Hanya ijinkan method POST dan hilangkan origin '*' karena request datang dari webhook internal Supabase
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validasi Webhook Secret
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    const authHeader = req.headers.get('authorization') || req.headers.get('x-webhook-secret');
    
    // Jika webhook secret di set di environment, validasi authorization
    if (webhookSecret && authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error('Unauthorized request: invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload = await req.json()
    const message = payload.record;
    if (!message) throw new Error("No record found in payload");

    // Don't send push if message sender is system (e.g. initial message)
    if (message.sender !== 'cs' && message.sender !== 'client') {
       return new Response(
         JSON.stringify({ message: `Ignored system message` }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const senderRole = message.sender; // 'cs' or 'client'
    const targetRole = senderRole === 'cs' ? 'client' : 'cs';
    let query = supabase.from('push_subscriptions').select('*').eq('role', targetRole);
    
    // Jika CS yang membalas, kirim notif HANYA ke client yang bersangkutan
    if (targetRole === 'client' && message.chat_id) {
      query = query.eq('chat_id', message.chat_id);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for role: ' + targetRole }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pushPayload = JSON.stringify({
      title: `Pesan dari ${message.senderName || 'HimawariDigi'}`,
      body: message.text || 'Mengirim gambar',
      url: targetRole === 'cs' ? `/cs.html` : `/`
    });

    const results: string[] = [];

    const sendPromises = subscriptions.map((sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh
        }
      };
      return webPush.sendNotification(pushSubscription, pushPayload)
        .then(() => {
          results.push('OK: ' + sub.endpoint.slice(-20));
        })
        .catch(async (err: any) => {
          console.error('Error sending push to', sub.endpoint, err.statusCode, err.body);
          results.push('FAIL(' + (err.statusCode || 'unknown') + '): ' + sub.endpoint.slice(-20));
          // If gone, delete from db
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        });
    });

    await Promise.all(sendPromises);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${subscriptions.length} subscriptions`,
        details: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
