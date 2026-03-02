// js/supabase-config.js
const SUPABASE_URL = 'https://aqqsmcytafkmatrjqjgp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcXNtY3l0YWZrbWF0cmpxamdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTMyMTIsImV4cCI6MjA4Nzk2OTIxMn0.m9ltMF-PolLH73tZXLA7Y6PH-9vuTfQSlrXnPQRubh8';

// Create the client and assign it to the window or a global variable
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);