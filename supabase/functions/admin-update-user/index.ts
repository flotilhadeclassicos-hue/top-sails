import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, nomeCompleto } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Busca o usuário pelo e-mail para garantir o ID correto
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const target = listData.users.find(u => u.email === email)
    if (!target) {
      return new Response(JSON.stringify({ error: `Usuário não encontrado: ${email}` }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const updates: Record<string, unknown> = {}
    if (password)     updates.password = password
    if (nomeCompleto) updates.data = { nomeCompleto }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(target.id, updates)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
