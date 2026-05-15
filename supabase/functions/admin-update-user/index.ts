import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok  = (body: object) => new Response(JSON.stringify({ ok: true,  ...body }), { headers: { ...cors, 'Content-Type': 'application/json' } })
const err = (msg: string)  => new Response(JSON.stringify({ ok: false, error: msg }), { headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

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
    if (authError || !caller) return err('Unauthorized: token inválido')

    const body = await req.json()
    const { action, email, password, nomeCompleto } = body

    // ── Listar todos os usuários do Supabase Auth ──────────────────────────
    if (action === 'list') {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (listError) return err(`listUsers: ${listError.message}`)
      const users = listData.users.map((u: { id: string; email?: string; created_at: string; email_confirmed_at?: string }) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        confirmed: !!u.email_confirmed_at,
      }))
      return ok({ users })
    }

    // ── Atualizar senha / nome ─────────────────────────────────────────────
    if (!email) return err('email obrigatório')

    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (listError) return err(`listUsers: ${listError.message}`)

    const target = listData.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase())
    if (!target) {
      const allEmails = listData.users.map((u: { email?: string }) => u.email).join(', ')
      return err(`Usuário não encontrado: "${email}". Existentes: ${allEmails}`)
    }

    const updates: Record<string, unknown> = { email_confirm: true }
    if (password)     updates.password = password
    if (nomeCompleto) updates.data = { nomeCompleto }

    const { data: updData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, updates)
    if (updateError) return err(`update falhou: ${updateError.message}`)

    return ok({ userId: updData.user.id, email: updData.user.email, confirmed: !!updData.user.email_confirmed_at })

  } catch (e) {
    return err(`Exceção: ${(e as Error).message}`)
  }
})
