#!/bin/bash
curl -s -X POST \
  "https://ccgymqxngnzqpxttdisd.supabase.co/functions/v1/send-reminders" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZ3ltcXhuZ256cXB4dHRkaXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjk1NzIsImV4cCI6MjA5ODY0NTU3Mn0.yNzc1L_NsyMXG5WXsuxS2oghOult5HMBUCNVMS3IKfI" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: onehabit-cron-2026" \
  -d '{}'
