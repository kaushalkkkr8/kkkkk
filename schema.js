import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";





export const contacts=pgTable("contacts",{
    id: serial('id').primaryKey(),
     phoneNumber: varchar('phoneNumber'),
     email:  varchar('email'),
     linkedId:integer("linkedId"),
     linkPrecedence :varchar('linkPrecedence'),
     createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
     updatedAt :timestamp('updatedAt', { withTimezone: true }).defaultNow(),
     deletedAt :timestamp('deletedAt', { withTimezone: true })
    }
)
   






