import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zozafkkeniwfzmgbdvga.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvemFma2tlbml3ZnptZ2JkdmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTk4ODEsImV4cCI6MjA5MjI3NTg4MX0.VJRiUxJPsOzomRNsSo41HEvqaFbadqpNxZZSabd95ao";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);