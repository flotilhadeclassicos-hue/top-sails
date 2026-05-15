import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok  = (body: unknown) => new Response(JSON.stringify({ ok: true,  ...body as object }), { headers: { ...cors, 'Content-Type': 'application/json' } })
const err = (msg: string)   => new Response(JSON.stringify({ ok: false, error: msg }),        { headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err('Unauthorized')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !caller) return err('Unauthorized')

    const { email, password, nomeCompleto } = await req.json()
    if (!email) return err('email obrigatório')

    // Localiza o usuário pelo e-mail
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (listError) return err(listError.message)

    const target = listData.users.find((u: { email?: string }) => u.email === email)
    if (!target) return err(`Usuário não encontrado: ${email}`)

    const updates: Record<string, unknown> = {}
    if (password)     updates.password = password
    if (nomeCompleto) updates.data = { nomeCompleto }

    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, updates)
    if (updateError) return err(updateError.message)

    return ok({ userId: data.user.id, email: data.user.email })
  } catch (e) {
    return err((e as Error).message)
  }
})
