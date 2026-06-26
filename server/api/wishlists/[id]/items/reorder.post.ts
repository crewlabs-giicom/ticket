import { getDb } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const wishlistId = Number(getRouterParam(event, 'id'))

  const [owns] = await db.execute(
    'SELECT id FROM wishlists WHERE id = ? AND user_id = ?', [wishlistId, user.id]
  ) as any[]
  if (!(owns as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Not found' })

  const body = await readBody(event)
  const orderedIds: number[] = body?.orderedIds || []

  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute(
      'UPDATE wishlist_items SET order_index = ? WHERE id = ? AND wishlist_id = ?',
      [i, orderedIds[i], wishlistId]
    )
  }

  return { success: true }
})
