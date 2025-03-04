import { and, eq, or } from "drizzle-orm"
import { db } from "../db.config.js"
import { contacts } from "../schema.js"



export const orderController = async (req, res) => {
    const { phoneNumber, email } = req.body

    try {
        const existingUsers = await db.select().from(contacts).where(or(eq(contacts.email, email), eq(contacts.phoneNumber, phoneNumber)))

        const exactMatch = existingUsers?.find(e => e.email === email && e.phoneNumber === phoneNumber);
        if (exactMatch) {
            return res.status(200).json({
                status: true,
                message: "User already exists",
            });
        }


        const primaryUser = existingUsers?.find(e => e.linkPrecedence === "primary")

        if (primaryUser) {

         

            const secondaryUser = await db.insert(contacts).values({
                phoneNumber,
                email,
                linkedId: primaryUser.id,
                linkPrecedence: "secondary"
            }).returning()
            console.log({ secondaryUser });
            const allSecondaryUsers = await db.select().from(contacts).where(
                and(eq(contacts.linkPrecedence, "secondary"), eq(contacts.linkedId, primaryUser.id),
                    or(eq(contacts.email, primaryUser.email), eq(contacts.phoneNumber, primaryUser.phoneNumber))
                )
            );
            console.log(allSecondaryUsers);


            let contact = {
                "primaryContatctId": primaryUser.id,
                "emails": [primaryUser.email, secondaryUser[0]?.email],
                "phoneNumbers": [primaryUser.phoneNumber, secondaryUser[0]?.phoneNumber],
                "secondaryContactIds": [secondaryUser[0]?.id]
            }
            return res.status(201).json({
                status: true,
                message: "User exists, used different credential",
                contact
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
