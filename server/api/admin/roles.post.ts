type RoleCode = 'user' | 'staff' | 'tournament_admin' | 'admin' | 'super_admin'

const roleCodes = [
  'user',
  'staff',
  'tournament_admin',
  'admin',
  'super_admin',
] as const

export default defineEventHandler(async (event) => {
  const { client } = await requireServerRole(event, 'super_admin')
  const body = await readBody<{
    userId?: string
    roleCode?: RoleCode
    assign?: boolean
  }>(event)

  if (
    !body?.userId ||
    !body.roleCode ||
    !roleCodes.includes(body.roleCode) ||
    !/^[0-9a-f-]{36}$/i.test(body.userId)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid role request',
    })
  }

  const { error } = await client.rpc('set_user_role', {
    target_user_id: body.userId,
    target_role_code: body.roleCode,
    should_assign: body.assign !== false,
  })

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role change rejected',
    })
  }

  return { ok: true }
})
