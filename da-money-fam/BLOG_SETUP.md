# DMF Daily Blog — Setup

## 1. Supabase

Run `supabase/blog.sql` in your DMF Supabase SQL Editor.

## 2. Secret

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Add to `.env.local`, Vercel, and the n8n **Post to Site** node Authorization header (Settings → Variables is Pro/Enterprise only — not on free self-hosted).

## 3. n8n

1. `ollama pull llama3.2:3b`
2. Import `n8n/daily-blog.json`
3. Test workflow → check `/blog`
4. Activate daily schedule

## 4. Test API

```powershell
$secret = "YOUR_SECRET"
$body = @{ slug="test-post"; title="Test"; excerpt="Test excerpt"; content=("word "*250); cover_image_url="/store/merch/custom-dmf-t-shirt.png"; is_published=$true } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3005/api/blog/ingest" -Method POST -Headers @{ Authorization="Bearer $secret"; "Content-Type"="application/json" } -Body $body
```
