import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok  = (body: object) => new Response(JSON.stringify({ ok: true,  ...body }), { headers: { ...cors, 'Content-Type': 'application/json' } })
const err = (msg: string, status = 400) => new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Proxy seguro entre o Top Sails (SPA) e a API da La Brújula.
// Valida a sessão Supabase do usuário e só então repassa a requisição com o
// token da La Brújula (mantido como secret, nunca exposto no navegador).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err('Unauthorized', 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !caller) return err('Unauthorized: token inválido', 401)

    const apiUrl   = Deno.env.get('LA_BRUJULA_API_URL')
    const apiToken = Deno.env.get('LA_BRUJULA_API_TOKEN')
    if (!apiUrl || !apiToken) return err('Integração não configurada (LA_BRUJULA_API_URL / LA_BRUJULA_API_TOKEN)')

    let desde = ''
    try {
      const body = await req.json()
      if (body?.desde) desde = String(body.desde)
    } catch { /* sem body — importa tudo */ }

    const url = desde ? `${apiUrl}?desde=${encodeURIComponent(desde)}` : apiUrl
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } })

    if (!resp.ok) {
      const txt = await resp.text()
      return err(`La Brújula respondeu ${resp.status}: ${txt.slice(0, 200)}`, 502)
    }

    const data = await resp.json()
    return ok({ total: data.total ?? 0, vendedores: data.vendedores ?? [], vendas: data.vendas ?? [] })

  } catch (e) {
    return err(`Exceção: ${(e as Error).message}`)
  }
})
