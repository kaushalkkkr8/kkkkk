import { and, eq, inArray, or } from "drizzle-orm"
import { db } from "../db.config.js"
import { contacts } from "../schema.js"



// export const orderController = async (req, res) => {
//     const { phoneNumber, email } = req.body

//     try {
//         const existingUsers = await db.select().from(contacts).where(or(eq(contacts.email, email), eq(contacts.phoneNumber, phoneNumber)))

//         const exactMatch = existingUsers?.find(e => e.email === email && e.phoneNumber === phoneNumber);
//         if (exactMatch) {
//             return res.status(200).json({
//                 status: true,
//                 message: "User already exists",
//             });
//         }


//         const primaryUser = existingUsers?.find(e => e.linkPrecedence === "primary")

//         if (primaryUser) {

//             const secondaryUser = await db.insert(contacts).values({
//                 phoneNumber,
//                 email,
//                 linkedId: primaryUser.id,
//                 linkPrecedence: "secondary"
//             }).returning()
//             console.log({ secondaryUser });
//             const allSecondaryUsers = await db.select().from(contacts).where(
//                 and(eq(contacts.linkPrecedence, "secondary"), eq(contacts.linkedId, primaryUser.id),
//                     or(eq(contacts.email, primaryUser.email), eq(contacts.phoneNumber, primaryUser.phoneNumber))
//                 )
//             );
//             console.log({allSecondaryUsers});


//             let contact = {
//                 "primaryContatctId": primaryUser.id,
//                 "emails": [primaryUser.email, ...allSecondaryUsers?.map(e=>e.email)],
//                 "phoneNumbers": [primaryUser.phoneNumber, ...allSecondaryUsers?.map(e=>e.phoneNumber)],
//                 "secondaryContactIds": [secondaryUser[0]?.id]
//             }
//             return res.status(201).json({
//                 status: true,
//                 message: "User exists, used different credential",
//                 contact
//             });
//         }



//         const newUser = await db.insert(contacts).values({
//             phoneNumber,
//             email,
//             linkPrecedence: "primary"
//         }).returning();

//         return res.status(201).json({
//             status: true,
//             message: "New User Created",
//             data: newUser
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ msg: "Internal Server Error" });
//     }
// }


export const orderController = async (req, res) => {
    let { phoneNumber, email } = req.body;

    // Trim and handle empty values
    phoneNumber = phoneNumber?.trim() || null;
    email = email?.trim() || null;

    if (!email && !phoneNumber) {
        return res.status(400).json({ status: false, message: "Provide at least email or phoneNumber." });
    }

    try {
        // Fetch users matching email or phoneNumber
        let existingUsers = await db
            .select()
            .from(contacts)
            .where(or(eq(contacts.email, email), eq(contacts.phoneNumber, phoneNumber)));

        console.log({ existingUsers });

        if (existingUsers.length) {
            // Identify primary users
            let primaryUsers = existingUsers.filter(e => e.linkPrecedence === "primary");

            if (primaryUsers.length === 0) {
                // If all are secondary, fetch their primary user
                primaryUsers = await db
                    .select()
                    .from(contacts)
                    .where(inArray(contacts.id, existingUsers.map(e => e.linkedId)));
            }

            // Determine the smallest ID primary user
            let primaryUser = primaryUsers.reduce((minUser, user) => (user.id < minUser.id ? user : minUser), primaryUsers[0]);

            // Fetch all secondary users linked to this primary
            const allSecondaryUsers = await db
                .select()
                .from(contacts)
                .where(eq(contacts.linkedId, primaryUser.id));

            // If the exact email and phone number exist, return the existing data
            if (existingUsers.some(e => e.email === email && e.phoneNumber === phoneNumber)) {
                return res.status(200).json({
                    status: true,
                    message: "User already exists",
                    contact: {
                        primaryContactId: primaryUser.id,
                        emails: Array.from(new Set([primaryUser.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
                        phoneNumbers: Array.from(new Set([primaryUser.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
                        secondaryContactIds: allSecondaryUsers.map(e => e.id)
                    }
                });
            }

            // If the new email or phone exists in secondary, return data
            const isAlreadyExisting =  allSecondaryUsers?.some(e => e.email === email || e.phoneNumber === phoneNumber);
            if (isAlreadyExisting) {
                return res.status(200).json({
                    status: true,
                    message: "User already exists",
                    contact: {
                        primaryContactId: primaryUser.id,
                        emails: Array.from(new Set([primaryUser.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
                        phoneNumbers: Array.from(new Set([primaryUser.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
                        secondaryContactIds: allSecondaryUsers.map(e => e.id)
                    }
                });
            }

            // If one of the provided values exists, link as a secondary user
            const newSecondary = await db.insert(contacts).values({
                phoneNumber,
                email,
                linkedId: primaryUser.id,
                linkPrecedence: "secondary"
            }).returning();

            allSecondaryUsers.push(newSecondary[0]);

            return res.status(201).json({
                status: true,
                message: "User exists, used different credential",
                contact: {
                    primaryContactId: primaryUser.id,
                    emails: Array.from(new Set([primaryUser.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
                    phoneNumbers: Array.from(new Set([primaryUser.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
                    secondaryContactIds: allSecondaryUsers.map(e => e.id)
                }
            });
        }

        // If both email and phoneNumber are new, create a new primary contact
        if (email && phoneNumber) {
            const newUser = await db.insert(contacts).values({
                phoneNumber,
                email,
                linkPrecedence: "primary"
            }).returning();

            return res.status(201).json({
                status: true,
                message: "New User Created",
                contact: {
                    primaryContactId: newUser[0]?.id,
                    emails: newUser[0]?.email ? [newUser[0]?.email] : [],
                    phoneNumbers: newUser[0]?.phoneNumber ? [newUser[0]?.phoneNumber] : [],
                    secondaryContactIds: []
                }
            });
        }

        return res.status(400).json({ status: false, message: "Invalid request." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};
