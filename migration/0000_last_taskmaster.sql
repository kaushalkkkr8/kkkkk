CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"phoneNumber" varchar,
	"email" varchar,
	"linkedId" integer,
	"linkPrecedence" varchar,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	"deletedAt" timestamp with time zone
);
