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
    if (!authHeader) return err('Unauthorized: sem header')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !caller) return err('Unauthorized: token inválido')

    const body = await req.json()
    console.log('[admin-update-user] body recebido:', JSON.stringify(body))

    const { email, password, nomeCompleto } = body

    if (!email) return err(`email obrigatório — body recebido: ${JSON.stringify(body)}`)

    // Lista todos os usuários para encontrar pelo e-mail
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (listError) return err(`listUsers falhou: ${listError.message}`)

    const total = listData.users.length
    const emails = listData.users.map((u: { email?: string }) => u.email)
    console.log(`[admin-update-user] ${total} usuários encontrados:`, emails)

    const target = listData.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase())
    if (!target) return err(`Usuário não encontrado: "${email}" — usuários existentes: ${emails.join(', ')}`)

    console.log('[admin-update-user] target encontrado:', target.id, target.email)

    const updates: Record<string, unknown> = {}
    if (password)     updates.password = password
    if (nomeCompleto) updates.data = { nomeCompleto }

    if (Object.keys(updates).length === 0) return err('Nenhuma alteração informada')

    const { data: updData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, updates)
    if (updateError) return err(`updateUserById falhou: ${updateError.message}`)

    console.log('[admin-update-user] atualizado com sucesso:', updData.user.id)
    return ok({ userId: updData.user.id, email: updData.user.email, updatedAt: updData.user.updated_at })

  } catch (e) {
    console.error('[admin-update-user] exceção:', e)
    return err(`Exceção: ${(e as Error).message}`)
  }
})
