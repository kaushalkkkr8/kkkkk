import { count, eq, or } from "drizzle-orm"
import { db } from "../db.config.js"
import { contacts } from "../schema.js"



    export const orderController = async (req, res) => {
        const { phoneNumber, email } = req.body
    
        try {
            const existingUsers = await db.select().from(contacts).where(or(eq(contacts.email, email), eq(contacts.phoneNumber, phoneNumber)))
    console.log({existingUsers});
    
            if (existingUsers?.length > 0) {
                const existingUser = existingUsers[0];
    
                await db.insert(contacts).values({
                    phoneNumber,
                    email,
                    linkedId: existingUser.id, 
                    linkPrecedence: "secondary"
                });
                return res.status(201).json({ 
                    status: true, 
                    message: "User exists, used different credential" 
                });
                }
    
             
    
                const newUser = await db.insert(contacts).values({
                    phoneNumber,
                    email,
                    linkPrecedence: "primary"
                }).returning(); 
        
                return res.status(201).json({ 
                    status: true, 
                    message: "New User Created", 
                    data: newUser 
                });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ msg: "Internal Server Error" });
        }
    }
