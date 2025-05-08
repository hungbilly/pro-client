
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";
import Stripe from "https://esm.sh/stripe@12.13.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper log function for debugging
function logStep(step: string, details?: any) {
  console.log(`[CREATE-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : "");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Use Supabase auth to get the user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authorization header from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      logStep("Authentication error", userError);
      throw new Error(`Authentication error: ${userError?.message || "User not found"}`);
    }
    
    logStep("User authenticated", { id: user.id, email: user.email });

    // Get request body
    const requestData = await req.json();
    const withTrial = requestData.withTrial !== false; // Default to true if not specified
    const productId = requestData.productId || "prod_SGsTE3Gxgd0acM"; // Updated product ID
    
    logStep("Request data", { withTrial, productId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2022-11-15",
    });
    
    logStep("Stripe initialized");

    // Check if the user already has an active subscription
    try {
      // First, check if user has a Stripe customer ID
      logStep("Checking if user already exists as Stripe customer");
      const { data: customers, error: customersError } = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customersError) {
        logStep("Error checking for existing customer", customersError);
        throw customersError;
      }
      
      // If user exists as a customer, check their subscriptions
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        logStep("Customer found in Stripe", { customerId });
        
        const { data: subscriptions, error: subscriptionsError } = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
        });
        
        if (subscriptionsError) {
          logStep("Error checking existing subscriptions", subscriptionsError);
          throw subscriptionsError;
        }
        
        if (subscriptions.data.length > 0) {
          logStep("User already has an active subscription", { 
            subscriptionId: subscriptions.data[0].id,
            status: subscriptions.data[0].status 
          });
          return new Response(
            JSON.stringify({
              alreadySubscribed: true,
              message: "User already has an active subscription",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (error) {
      logStep("Error during subscription check", error);
      // Continue with subscription creation even if check fails
    }

    // Create the subscription
    try {
      // Create or retrieve customer
      let customerId: string;
      const { data: existingCustomers, error: customersError } = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customersError) {
        logStep("Error checking for existing customer", customersError);
        throw customersError;
      }
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        logStep("Using existing Stripe customer", { customerId });
      } else {
        const { data: newCustomer, error: createCustomerError } = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
          },
        });
        
        if (createCustomerError || !newCustomer) {
          logStep("Error creating customer", createCustomerError);
          throw createCustomerError || new Error("Failed to create customer");
        }
        
        customerId = newCustomer.id;
        logStep("Created new Stripe customer", { customerId });
      }

      // Get price ID
      // Live mode price ID
      const priceId = "price_1R7pXrDHpTYL9aMbsXZNAntx"; // Keep the existing price ID
      
      logStep("Creating checkout session", { customerId, priceId });
      
      const origin = new URL(req.url).origin;
      const params: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.get("origin") || origin}/subscription/success`,
        cancel_url: `${req.headers.get("origin") || origin}/subscription/cancel`,
        subscription_data: withTrial
          ? {
              trial_period_days: 30, // 30-day free trial
            }
          : undefined,
      };

      const { data: session, error: sessionError } = await stripe.checkout.sessions.create(params);
      
      if (sessionError || !session) {
        logStep("Error creating checkout session", sessionError);
        throw sessionError || new Error("Failed to create checkout session");
      }
      
      logStep("Checkout session created", { sessionId: session.id, url: session.url });
      
      return new Response(
        JSON.stringify({
          url: session.url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      logStep("Error creating subscription", error);
      throw error;
    }
  } catch (error) {
    logStep("Error in create-subscription function", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
