
-- Add company column to clients table to store the client's company name
ALTER TABLE public.clients 
ADD COLUMN company text;
