import ws from 'ws'
import pg from 'pg'

const pool = new pg.Pool({
  database: 'qa_beta',
  user: 'postgres',
  password: '123456',
})

const wss = new ws.Server({
  port: 1234,
})

let messages = []

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const extractData = JSON.parse(data)
    const { payload } = extractData
    const queryText = {
      text: `
                WITH CTE AS
                         (
                             INSERT INTO chat_message ("roomId", "userId", content)
                                 VALUES ($1, $2, $3)
                                 RETURNING id, "roomId", "userId", content, "creationTime", type
                         )
                SELECT CTE.id,
                       CTE."roomId",
                       CTE.content,
                       CTE."creationTime",
                       CTE.type,
                       (SELECT row_to_json(u) FROM "user" u WHERE u.id = CTE."userId") AS "user"
                FROM CTE
            `,
      values: [1, 1, payload.content],
    }
    const { rows } = await pool.query(queryText)

    const formatJSON = {
      event: 'message',
      payload: rows[0],
    }

    messages.push(formatJSON)
    wss.clients.forEach((client) => {
      client.send(JSON.stringify(formatJSON))
    })
  })
})

console.log('App listening on ws://localhost:1234')
