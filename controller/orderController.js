import { and, eq, inArray, or } from "drizzle-orm"
import { db } from "../db.config.js"
import { contacts } from "../schema.js"






// export const orderController = async (req, res) => {
//     let { phoneNumber, email } = req.body;

//     // Trim and check for empty values
 

//     if (!email && !phoneNumber) {
//         return res.status(400).json({ status: false, message: "Provide at least email or phoneNumber." });
//     }

//     try {
//         // Fetch matching contacts based on email or phoneNumber
//         let query = db.select().from(contacts);
//         if (email && phoneNumber) {
//             query = query.where(or(eq(contacts.email, email), eq(contacts.phoneNumber, phoneNumber)));
//         } else if (email) {
//             query = query.where(eq(contacts.email, email));
//         } else if (phoneNumber) {
//             query = query.where(eq(contacts.phoneNumber, phoneNumber));
//         }

//         const existingUsers = await query;
//         console.log({existingUsers});
        

//         if (!existingUsers.length) {
//             // No matching contact found, create a new primary contact
//             if(email.length>0 && phoneNumber.length>0){

//                 const newUser = await db.insert(contacts).values({
//                     phoneNumber,
//                     email,
//                     linkPrecedence: "primary"
//                 }).returning();
                
//                 return res.status(201).json({
//                     status: true,
//                     message: "New User Created",
//                     contact: {
//                         primaryContatctId: newUser[0]?.id,
//                         emails: newUser[0]?.email ? [newUser[0]?.email] : [],
//                         phoneNumbers: newUser[0]?.phoneNumber ? [newUser[0]?.phoneNumber] : [],
//                         secondaryContactIds: []
//                     }
//                 });
//             }else{
//                 return res.status(400).json({ status: false, message: "User Not Found." })
//             }
//         }

//         // Find the primary user
//         let primaryUsers = existingUsers.find(e => e.linkPrecedence === "primary");
        
//         if (!primaryUsers) {
//             // If all found users are secondary, get their primary user
//             primaryUsers = await db
//                 .select()
//                 .from(contacts)
//                 .where(eq(contacts.id, existingUsers[0]?.linkedId))
//                 .then(rows => rows[0]);
//         }

//         // Fetch all secondary users linked to the primary
//         const allSecondaryUsers = await db
//             .select()
//             .from(contacts)
//             .where(eq(contacts.linkedId, primaryUsers.id));


            

//         // If an exact match exists, return data without inserting anything
//         if (existingUsers.some(e => e.email === email && e.phoneNumber === phoneNumber)) {
//             return res.status(200).json({
//                 status: true,
//                 message: "User already exists",
//                 contact: {
//                     primaryContatctId: primaryUsers.id,
//                     emails: Array.from(new Set([primaryUsers.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
//                     phoneNumbers: Array.from(new Set([primaryUsers.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
//                     secondaryContactIds: allSecondaryUsers.map(e => e.id)
//                 }
//             });
//         }

//         // Check if the provided email or phoneNumber already exists in secondary
//         const isAlreadyExisting = [...existingUsers, ...allSecondaryUsers].some(e => e.email === email || e.phoneNumber === phoneNumber);
//         if (isAlreadyExisting) {
//             return res.status(200).json({
//                 status: true,
//                 message: "User already exists",
//                 contact: {
//                     primaryContatctId: primaryUsers.id,
//                     emails: Array.from(new Set([primaryUsers.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
//                     phoneNumbers: Array.from(new Set([primaryUsers.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
//                     secondaryContactIds: allSecondaryUsers.map(e => e.id)
//                 }
//             });
//         }

//         // Insert new secondary contact
//         const newSecondary = await db.insert(contacts).values({
//             phoneNumber,
//             email,
//             linkedId: primaryUsers.id,
//             linkPrecedence: "secondary"
//         }).returning();

//         allSecondaryUsers.push(newSecondary[0]);

//         return res.status(201).json({
//             status: true,
//             message: "User exists, used different credential",
//             contact: {
//                 primaryContatctId: primaryUsers.id,
//                 emails: Array.from(new Set([primaryUsers.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
//                 phoneNumbers: Array.from(new Set([primaryUsers.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
//                 secondaryContactIds: allSecondaryUsers.map(e => e.id)
//             }
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ status: false, message: "Internal Server Error" });
//     }
// };


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

        if (!existingUsers.length) {
            // No match found → Create a new primary contact
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

        // Find all unique primary contacts from existing users
        let primaryUsers = existingUsers.filter(e => e.linkPrecedence === "primary");

        if (primaryUsers.length === 0) {
            // If all are secondary, fetch their actual primary
            primaryUsers = await db
                .select()
                .from(contacts)
                .where(inArray(contacts.id, existingUsers.map(e => e.linkedId)));
        }

        // Find the smallest ID primary user
        let primaryUser = primaryUsers.reduce((minUser, user) => (user.id < minUser.id ? user : minUser), primaryUsers[0]);

        // If there are multiple primary users, merge them
        for (let user of primaryUsers) {
            if (user.id !== primaryUser.id) {
                // Convert other primary users to secondary and link them to the smallest ID primary
                await db
                    .update(contacts)
                    .set({ linkedId: primaryUser.id, linkPrecedence: "secondary" })
                    .where(eq(contacts.id, user.id));
            }
        }

        // Fetch all secondary users linked to this primary
        const allSecondaryUsers = await db
            .select()
            .from(contacts)
            .where(eq(contacts.linkedId, primaryUser.id));

        // If the email or phoneNumber is already linked, return existing details
        // const isAlreadyLinked = existingUsers.some(e => e.email === email && e.phoneNumber === phoneNumber) ||
        //     allSecondaryUsers.some(e => e.email === email || e.phoneNumber === phoneNumber);
        const isAlreadyExisting = [...existingUsers, ...allSecondaryUsers].some(e => e.email === email || e.phoneNumber === phoneNumber);

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

        // Insert new secondary user linked to primary
        const newSecondary = await db.insert(contacts).values({
            phoneNumber,
            email,
            linkedId: primaryUser.id,
            linkPrecedence: "secondary"
        }).returning();

        allSecondaryUsers.push(newSecondary[0]);

        return res.status(201).json({
            status: true,
            message: "User exists, linked under primary",
            contact: {
                primaryContactId: primaryUser.id,
                emails: Array.from(new Set([primaryUser.email, ...allSecondaryUsers.map(e => e.email)].filter(Boolean))),
                phoneNumbers: Array.from(new Set([primaryUser.phoneNumber, ...allSecondaryUsers.map(e => e.phoneNumber)].filter(Boolean))),
                secondaryContactIds: allSecondaryUsers.map(e => e.id)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

