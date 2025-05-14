
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@15.12.0?dts";

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
    const productId = requestData.productId || "prod_SGsTE3Gxgd0acM"; 
    
    logStep("Request data", { withTrial, productId });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    // Check if using live or test API key and log it (safely)
    if (stripeKey) {
      const isLiveKey = stripeKey.startsWith("sk_live_");
      const keyPrefix = stripeKey.substring(0, 8); // Only log the first 8 chars for safety
      logStep("Stripe API key info", { 
        isLiveKey, 
        keyPrefix: keyPrefix + "..." + (stripeKey.length - 8) + " chars",
        apiVersion: "2023-10-16"
      });
    } else {
      logStep("STRIPE_SECRET_KEY is missing or empty!");
      throw new Error("Stripe API key is missing");
    }
    
    let stripe: Stripe;
    try {
      // Update to use the same Stripe API version as the webhook function
      stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16",
      });
      logStep("Stripe initialized");
    } catch (initError) {
      logStep("Failed to initialize Stripe client", initError);
      throw new Error(`Failed to initialize Stripe: ${initError.message}`);
    }

    // Check if the user already has an active subscription
    try {
      // First, check if user has a Stripe customer ID
      logStep("Checking if user already exists as Stripe customer");
      let customers;
      try {
        customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
        logStep("Customer lookup successful", { 
          found: customers.data.length > 0,
          responseType: typeof customers,
          dataType: Array.isArray(customers.data) ? 'array' : typeof customers.data
        });
      } catch (customerError) {
        logStep("Error in customer lookup", { 
          error: customerError.message, 
          type: customerError.type,
          code: customerError.code || 'no_code'
        });
        throw customerError;
      }
      
      // If user exists as a customer, check their subscriptions
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        logStep("Customer found in Stripe", { customerId });
        
        let subscriptions;
        try {
          subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
          });
          logStep("Subscription lookup successful", { count: subscriptions.data.length });
        } catch (subscriptionsError) {
          logStep("Error checking existing subscriptions", { 
            error: subscriptionsError.message,
            type: subscriptionsError.type,
            code: subscriptionsError.code || 'no_code'
          });
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
      logStep("Error during subscription check", {
        message: error.message,
        type: error.type || 'unknown_type',
        code: error.code || 'no_code',
        stack: error.stack ? error.stack.substring(0, 200) : 'no_stack'
      });
      // Continue with subscription creation even if check fails
    }

    // Create the subscription
    try {
      // Create or retrieve customer
      let customerId: string;
      
      try {
        const existingCustomers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
        
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
          logStep("Using existing Stripe customer", { customerId });
        } else {
          logStep("Creating new Stripe customer");
          const newCustomer = await stripe.customers.create({
            email: user.email,
            metadata: {
              user_id: user.id,
            },
          });
          
          customerId = newCustomer.id;
          logStep("Created new Stripe customer", { customerId });
        }
      } catch (customerError) {
        logStep("Error with customer creation/retrieval", {
          message: customerError.message,
          type: customerError.type || 'unknown_type',
          code: customerError.code || 'no_code'
        });
        throw customerError;
      }

      // Get price ID - use the same live mode price ID
      const priceId = "price_1RMKipDxgtkbR05sO7kNXLq6";
      logStep("Using price ID", { priceId });
      
      // Verify the price exists in Stripe
      try {
        const price = await stripe.prices.retrieve(priceId);
        logStep("Price verified in Stripe", { 
          priceId,
          active: price.active,
          currency: price.currency,
          unitAmount: price.unit_amount
        });
      } catch (priceError) {
        logStep("Error verifying price ID", {
          priceId,
          error: priceError.message,
          type: priceError.type || 'unknown_type',
          code: priceError.code || 'no_code'
        });
        throw new Error(`Invalid price ID (${priceId}): ${priceError.message}`);
      }
      
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
        client_reference_id: user.id, // Add the user ID as a reference
        subscription_data: withTrial
          ? {
              trial_period_days: 30, // 30-day free trial
            }
          : undefined,
      };

      // Log the checkout session parameters
      logStep("Checkout session parameters", {
        customer: customerId,
        line_items: `[${priceId} x 1]`,
        mode: "subscription",
        success_url: `${req.headers.get("origin") || origin}/subscription/success`,
        cancel_url: `${req.headers.get("origin") || origin}/subscription/cancel`,
        withTrial,
        trialDays: withTrial ? 30 : 'none',
        client_reference_id: user.id
      });

      try {
        const session = await stripe.checkout.sessions.create(params);
        logStep("Checkout session created", { sessionId: session.id, url: session.url });
        
        // Store the session information in the database
        try {
          const { error: sessionInsertError } = await supabaseClient
            .from('subscription_sessions')
            .insert({
              user_id: user.id,
              session_id: session.id,
              status: 'created'
            });
            
          if (sessionInsertError) {
            logStep("Error saving session to database", sessionInsertError);
            // Continue even if database insert fails
          } else {
            logStep("Session saved to database");
          }
        } catch (dbError) {
          logStep("Database error when saving session", dbError);
          // Continue even if there's a database error
        }
        
        return new Response(
          JSON.stringify({
            url: session.url,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (sessionError) {
        logStep("Error creating checkout session", {
          error: sessionError.message,
          type: sessionError.type || 'unknown_type',
          code: sessionError.code || 'no_code',
          requestId: sessionError.requestId || 'no_request_id'
        });
        throw sessionError;
      }
    } catch (error) {
      logStep("Error creating subscription", {
        message: error.message,
        type: error.type || 'unknown_type',
        code: error.code || 'no_code',
        requestId: error.requestId || 'no_request_id'
      });
      throw error;
    }
  } catch (error) {
    logStep("Error in create-subscription function", {
      message: error.message,
      stack: error.stack ? error.stack.substring(0, 200) : 'no_stack'
    });
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
