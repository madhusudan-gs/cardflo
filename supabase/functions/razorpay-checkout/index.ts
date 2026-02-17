// Razorpay Checkout Edge Function
// Deploy via Supabase Dashboard → Edge Functions → "razorpay-checkout"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_IDS: Record<string, string> = {
    lite: Deno.env.get("RAZORPAY_PLAN_LITE") || "",
    standard: Deno.env.get("RAZORPAY_PLAN_STANDARD") || "",
    pro: Deno.env.get("RAZORPAY_PLAN_PRO") || "",
    team: Deno.env.get("RAZORPAY_PLAN_TEAM") || "",
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { tier, userId, email } = await req.json();

        if (!tier || !userId) {
            return new Response(JSON.stringify({ error: "Missing tier or userId" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (tier === "starter") {
            return new Response(JSON.stringify({ error: "Starter tier is free" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const planId = PLAN_IDS[tier];
        if (!planId) {
            return new Response(JSON.stringify({ error: "Invalid plan configuration" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
        const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

        // Create subscription via Razorpay REST API
        const razorpayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
            },
            body: JSON.stringify({
                plan_id: planId,
                customer_notify: 1,
                total_count: 120,
                notes: {
                    userId: userId,
                    tier: tier,
                },
            }),
        });

        if (!razorpayRes.ok) {
            const errData = await razorpayRes.json();
            console.error("Razorpay API error:", errData);
            return new Response(JSON.stringify({ error: errData.error?.description || "Razorpay API error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const subscription = await razorpayRes.json();

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                key: keyId,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Razorpay checkout error:", error);
        return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
