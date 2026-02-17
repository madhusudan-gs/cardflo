// Razorpay Webhook Edge Function
// Deploy this via Supabase Dashboard → Edge Functions → New Function → "razorpay-webhook"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSHA256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const msgData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify signature
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
        console.error("Missing RAZORPAY_WEBHOOK_SECRET");
        return new Response(JSON.stringify({ error: "Webhook not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const expectedSignature = await hmacSHA256(webhookSecret, rawBody);

    if (expectedSignature !== signature) {
        console.error("Webhook signature verification failed");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event = JSON.parse(rawBody);

    try {
        const subscription = event.payload.subscription.entity;
        const notes = subscription.notes;
        const userId = notes.userId;
        const tier = notes.tier;

        if (!userId || !tier) {
            console.warn("Missing userId or tier in notes");
            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let status = "active";
        let billingCycleEnd: string | undefined;

        switch (event.event) {
            case "subscription.charged":
                status = "active";
                billingCycleEnd = new Date(subscription.charge_at * 1000).toISOString();
                break;
            case "subscription.cancelled":
                status = "canceled";
                break;
            case "subscription.halted":
                status = "past_due";
                break;
            default:
                console.log("Unhandled event:", event.event);
                return new Response(JSON.stringify({ received: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
        }

        const updateData: Record<string, any> = {
            subscription_tier: tier,
            subscription_status: status,
            razorpay_customer_id: subscription.customer_id,
            razorpay_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
        };

        if (billingCycleEnd) {
            updateData.billing_cycle_end = billingCycleEnd;
        }

        const { error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", userId);

        if (error) {
            console.error("Profile update error:", error);
            return new Response(JSON.stringify({ error: "Database update failed" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`[SUBSCRIPTION UPDATE] User: ${userId}, Tier: ${tier}, Status: ${status}`);

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
